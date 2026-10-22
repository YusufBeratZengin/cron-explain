import { CronValidationError } from './errors.js';

export const MONTH_NAMES = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

export const DOW_NAMES = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

export const QUARTZ_DOW_NAMES = {
  SUN: 1, MON: 2, TUE: 3, WED: 4, THU: 5, FRI: 6, SAT: 7,
};

export const FIELD_DEFINITIONS = [
  { name: 'second', min: 0, max: 59 },
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'dayOfMonth', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12 },
  { name: 'dayOfWeek', min: 0, max: 7 },
  { name: 'year', min: 1970, max: 2099 },
];

export const STANDARD_ALIASES = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

/**
 * Tokenize a raw cron expression string preserving exact character offsets.
 * @param {string} raw
 * @returns {Array<{ text: string, start: number, end: number }>}
 */
export function tokenizeExpression(raw) {
  const tokens = [];
  const regex = /\S+/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    tokens.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return tokens;
}

/**
 * Parse and validate a cron expression string.
 * @param {string} expression
 * @param {Object} [options]
 * @param {'auto' | 'unix' | 'quartz'} [options.type='auto']
 * @returns {Object} Parsed cron structure
 */
export function parseCron(expression, options = {}) {
  if (typeof expression !== 'string') {
    throw new CronValidationError({
      message: 'Expression must be a string.',
      expression: String(expression ?? ''),
      startCol: 0,
      endCol: 0,
    });
  }

  const trimmed = expression.trim();
  if (!trimmed) {
    throw new CronValidationError({
      message: 'Cron expression cannot be empty.',
      expression,
      startCol: 0,
      endCol: expression.length,
    });
  }

  // Check aliases
  const lowerTrimmed = trimmed.toLowerCase();
  if (lowerTrimmed === '@reboot') {
    return {
      raw: expression,
      alias: '@reboot',
      isReboot: true,
      fieldsCount: 0,
      type: 'unix',
      fields: null,
    };
  }

  if (STANDARD_ALIASES[lowerTrimmed]) {
    const expanded = STANDARD_ALIASES[lowerTrimmed];
    const parsed = parseCronFields(expanded, expression, options);
    parsed.alias = lowerTrimmed;
    return parsed;
  }

  return parseCronFields(expression, expression, options);
}

/**
 * Parse whitespace-separated cron fields.
 * @param {string} fieldString
 * @param {string} originalExpression
 * @param {Object} options
 */
function parseCronFields(fieldString, originalExpression, options = {}) {
  const tokens = tokenizeExpression(fieldString);
  const count = tokens.length;

  if (count < 5 || count > 7) {
    const start = tokens.length > 0 ? tokens[0].start : 0;
    const end = tokens.length > 0 ? tokens[tokens.length - 1].end : fieldString.length;
    throw new CronValidationError({
      message: `Expected 5, 6, or 7 fields, but got ${count}.`,
      expression: originalExpression,
      startCol: start,
      endCol: end,
    });
  }

  let cronType = options.type || 'auto';
  let fieldTokens = [];

  if (count === 5) {
    // Unix standard: minute, hour, dom, month, dow
    fieldTokens = [
      { text: '0', start: 0, end: 0, virtual: true, name: 'second' },
      { ...tokens[0], name: 'minute' },
      { ...tokens[1], name: 'hour' },
      { ...tokens[2], name: 'dayOfMonth' },
      { ...tokens[3], name: 'month' },
      { ...tokens[4], name: 'dayOfWeek' },
      { text: '*', start: 0, end: 0, virtual: true, name: 'year' },
    ];
    if (cronType === 'auto') {
      const hasQuartzChars = tokens.some((t) => /[?LW#]/.test(t.text));
      cronType = hasQuartzChars ? 'quartz' : 'unix';
    }
  } else if (count === 6) {
    // Determine if last token is year (e.g. 4-digit number or range like 2026 or 2020-2030)
    const lastToken = tokens[5].text;
    const isYearLast = /^\d{4}(-\d{4})?$/.test(lastToken);

    if (isYearLast && !tokens[0].text.includes('*') && !/^\d{4}/.test(tokens[0].text)) {
      // Unix + year: minute, hour, dom, month, dow, year
      fieldTokens = [
        { text: '0', start: 0, end: 0, virtual: true, name: 'second' },
        { ...tokens[0], name: 'minute' },
        { ...tokens[1], name: 'hour' },
        { ...tokens[2], name: 'dayOfMonth' },
        { ...tokens[3], name: 'month' },
        { ...tokens[4], name: 'dayOfWeek' },
        { ...tokens[5], name: 'year' },
      ];
      if (cronType === 'auto') cronType = 'unix';
    } else {
      // Standard Quartz 6-field: second, minute, hour, dom, month, dow
      fieldTokens = [
        { ...tokens[0], name: 'second' },
        { ...tokens[1], name: 'minute' },
        { ...tokens[2], name: 'hour' },
        { ...tokens[3], name: 'dayOfMonth' },
        { ...tokens[4], name: 'month' },
        { ...tokens[5], name: 'dayOfWeek' },
        { text: '*', start: 0, end: 0, virtual: true, name: 'year' },
      ];
      if (cronType === 'auto') {
        const hasQuartzChars = tokens.some((t) => /[?LW#]/.test(t.text));
        cronType = hasQuartzChars ? 'quartz' : 'unix';
      }
    }
  } else {
    // 7 fields: second, minute, hour, dom, month, dow, year
    fieldTokens = [
      { ...tokens[0], name: 'second' },
      { ...tokens[1], name: 'minute' },
      { ...tokens[2], name: 'hour' },
      { ...tokens[3], name: 'dayOfMonth' },
      { ...tokens[4], name: 'month' },
      { ...tokens[5], name: 'dayOfWeek' },
      { ...tokens[6], name: 'year' },
    ];
    if (cronType === 'auto') cronType = 'quartz';
  }

  // Parse each of the 7 fields
  const parsedFields = {};
  for (let i = 0; i < fieldTokens.length; i++) {
    const fToken = fieldTokens[i];
    const def = FIELD_DEFINITIONS[i];
    const parsedField = parseSingleField(
      fToken,
      def,
      cronType,
      originalExpression,
      i
    );
    parsedFields[def.name] = parsedField;
  }

  return {
    raw: originalExpression,
    alias: null,
    isReboot: false,
    fieldsCount: count,
    type: cronType,
    fields: parsedFields,
  };
}

/**
 * Parse an individual cron field (e.g. "1,15,30" or step or "MON-FRI" or "5L").
 */
function parseSingleField(token, def, cronType, originalExpression, fieldIndex) {
  const text = token.text;
  const isDom = def.name === 'dayOfMonth';
  const isDow = def.name === 'dayOfWeek';

  // Handle Question mark '?' (allowed in Quartz DOM and DOW)
  if (text === '?') {
    if (!isDom && !isDow) {
      throw new CronValidationError({
        message: `'?' is only allowed in Day-of-Month or Day-of-Week.`,
        expression: originalExpression,
        fieldIndex,
        fieldName: def.name,
        startCol: token.start,
        endCol: token.end,
      });
    }
    return {
      name: def.name,
      raw: text,
      start: token.start,
      end: token.end,
      isQuestion: true,
      isWildcard: false,
      items: [{ type: 'question' }],
      values: null,
    };
  }

  // Split by comma
  const parts = text.split(',');
  const items = [];
  const allValues = new Set();
  let hasDynamicSpecial = false;

  let partStart = token.start;
  for (let p = 0; p < parts.length; p++) {
    const part = parts[p];
    const partEnd = partStart + part.length;

    if (part === '') {
      throw new CronValidationError({
        message: `Empty list item in ${def.name} field.`,
        expression: originalExpression,
        fieldIndex,
        fieldName: def.name,
        startCol: partStart,
        endCol: partEnd + 1,
      });
    }

    const parsedItem = parsePartItem(
      part,
      def,
      cronType,
      originalExpression,
      fieldIndex,
      partStart,
      partEnd
    );

    items.push(parsedItem);

    if (parsedItem.values) {
      for (const v of parsedItem.values) {
        allValues.add(v);
      }
    } else {
      hasDynamicSpecial = true;
    }

    partStart = partEnd + 1; // skip comma
  }

  const isWildcard = items.length === 1 && items[0].type === 'wildcard';

  return {
    name: def.name,
    raw: text,
    start: token.start,
    end: token.end,
    isQuestion: false,
    isWildcard,
    items,
    values: hasDynamicSpecial ? null : Array.from(allValues).sort((a, b) => a - b),
  };
}

/**
 * Parse a single comma-separated item in a field (e.g. "*", "1-5", step, "LW", "5L", "5#3").
 */
function parsePartItem(part, def, cronType, originalExpression, fieldIndex, startCol, endCol) {
  const isDom = def.name === 'dayOfMonth';
  const isDow = def.name === 'dayOfWeek';

  // Step notation: expr/step
  if (part.includes('/')) {
    const slashParts = part.split('/');
    if (slashParts.length !== 2) {
      throw new CronValidationError({
        message: `Invalid step syntax '${part}' in ${def.name} field.`,
        expression: originalExpression,
        fieldIndex,
        fieldName: def.name,
        startCol,
        endCol,
      });
    }

    const [rangePart, stepStr] = slashParts;
    const step = parseInt(stepStr, 10);
    if (!/^\d+$/.test(stepStr) || isNaN(step) || step < 1) {
      throw new CronValidationError({
        message: `Step '${stepStr}' must be a positive integer in ${def.name} field.`,
        expression: originalExpression,
        fieldIndex,
        fieldName: def.name,
        startCol,
        endCol,
      });
    }

    let min = def.min;
    let max = def.max;

    if (rangePart === '*' || rangePart === '?') {
      // Step over full range
      if (def.name === 'dayOfWeek') {
        min = cronType === 'quartz' ? 1 : 0;
        max = cronType === 'quartz' ? 7 : 6;
      }
    } else if (rangePart.includes('-')) {
      const [rMinStr, rMaxStr] = rangePart.split('-');
      min = resolveValue(rMinStr, def, cronType, originalExpression, fieldIndex, startCol, endCol);
      max = resolveValue(rMaxStr, def, cronType, originalExpression, fieldIndex, startCol, endCol);
      if (min > max) {
        throw new CronValidationError({
          message: `Range start '${rMinStr}' is greater than range end '${rMaxStr}' in ${def.name}.`,
          expression: originalExpression,
          fieldIndex,
          fieldName: def.name,
          startCol,
          endCol,
        });
      }
    } else {
      // Single number base: e.g. "2/5" (start at 2, step by 5)
      min = resolveValue(rangePart, def, cronType, originalExpression, fieldIndex, startCol, endCol);
      if (def.name === 'dayOfWeek' && cronType !== 'quartz' && max === 7) {
        max = 6;
      }
    }

    const values = [];
    for (let v = min; v <= max; v += step) {
      values.push(v);
    }

    return {
      type: 'step',
      raw: part,
      min,
      max,
      step,
      values,
    };
  }

  // Wildcard '*'
  if (part === '*') {
    let min = def.min;
    let max = def.max;
    if (def.name === 'dayOfWeek' && cronType !== 'quartz' && max === 7) {
      max = 6;
    }
    const values = [];
    for (let v = min; v <= max; v++) {
      values.push(v);
    }
    return {
      type: 'wildcard',
      raw: part,
      values,
    };
  }

  // Day-of-Month Quartz specials: L, LW, L-offset, nW
  if (isDom) {
    if (part === 'L') {
      return { type: 'lastDayOfMonth', raw: part, values: null };
    }
    if (part === 'LW') {
      return { type: 'lastWeekdayOfMonth', raw: part, values: null };
    }
    const lOffsetMatch = /^L-(\d+)$/.exec(part);
    if (lOffsetMatch) {
      const offset = parseInt(lOffsetMatch[1], 10);
      if (offset < 1 || offset > 30) {
        throw new CronValidationError({
          message: `L-offset '${offset}' must be between 1 and 30 in Day-of-Month.`,
          expression: originalExpression,
          fieldIndex,
          fieldName: def.name,
          startCol,
          endCol,
        });
      }
      return { type: 'daysBeforeEndOfMonth', offset, raw: part, values: null };
    }
    const wMatch = /^(\d+)W$/.exec(part);
    if (wMatch) {
      const day = parseInt(wMatch[1], 10);
      if (day < 1 || day > 31) {
        throw new CronValidationError({
          message: `Nearest weekday '${part}' day must be between 1 and 31.`,
          expression: originalExpression,
          fieldIndex,
          fieldName: def.name,
          startCol,
          endCol,
        });
      }
      return { type: 'nearestWeekday', day, raw: part, values: null };
    }
  }

  // Day-of-Week Quartz specials: L, dL, d#nth
  if (isDow) {
    if (part === 'L') {
      // Last day of week (Saturday = 7 in Quartz, 6 in Unix)
      const dayVal = cronType === 'quartz' ? 7 : 6;
      return { type: 'number', value: dayVal, raw: part, values: [dayVal] };
    }
    // dL: e.g. 5L or FRIL (last Friday of month)
    const dlMatch = /^([A-Za-z]+|\d+)L$/.exec(part);
    if (dlMatch) {
      const dowVal = resolveDowValue(
        dlMatch[1],
        cronType,
        originalExpression,
        fieldIndex,
        startCol,
        endCol
      );
      return { type: 'lastWeekdayOccurrence', dayOfWeek: dowVal, raw: part, values: null };
    }
    // d#nth: e.g. 5#3 or FRI#3 (3rd Friday of month)
    const hashMatch = /^([A-Za-z]+|\d+)#(\d+)$/.exec(part);
    if (hashMatch) {
      const dowVal = resolveDowValue(
        hashMatch[1],
        cronType,
        originalExpression,
        fieldIndex,
        startCol,
        endCol
      );
      const nth = parseInt(hashMatch[2], 10);
      if (nth < 1 || nth > 5) {
        throw new CronValidationError({
          message: `Weekday occurrence index '${nth}' must be between 1 and 5 in Day-of-Week.`,
          expression: originalExpression,
          fieldIndex,
          fieldName: def.name,
          startCol,
          endCol,
        });
      }
      return {
        type: 'nthWeekdayOccurrence',
        dayOfWeek: dowVal,
        nth,
        raw: part,
        values: null,
      };
    }
  }

  // Range: min-max (e.g. 9-17 or MON-FRI)
  if (part.includes('-')) {
    const rangeParts = part.split('-');
    if (rangeParts.length !== 2) {
      throw new CronValidationError({
        message: `Invalid range format '${part}' in ${def.name}.`,
        expression: originalExpression,
        fieldIndex,
        fieldName: def.name,
        startCol,
        endCol,
      });
    }

    const min = resolveValue(rangeParts[0], def, cronType, originalExpression, fieldIndex, startCol, endCol);
    const max = resolveValue(rangeParts[1], def, cronType, originalExpression, fieldIndex, startCol, endCol);

    if (min > max) {
      throw new CronValidationError({
        message: `Range start '${rangeParts[0]}' is greater than range end '${rangeParts[1]}' in ${def.name}.`,
        expression: originalExpression,
        fieldIndex,
        fieldName: def.name,
        startCol,
        endCol,
      });
    }

    const values = [];
    for (let v = min; v <= max; v++) {
      values.push(v);
    }

    return {
      type: 'range',
      raw: part,
      min,
      max,
      values,
    };
  }

  // Single literal value or name
  const val = resolveValue(part, def, cronType, originalExpression, fieldIndex, startCol, endCol);
  return {
    type: 'number',
    raw: part,
    value: val,
    values: [val],
  };
}

/**
 * Resolve a single value token into an integer within field boundaries.
 */
function resolveValue(tokenStr, def, cronType, originalExpression, fieldIndex, startCol, endCol) {
  const upper = tokenStr.toUpperCase();

  // Month names
  if (def.name === 'month' && MONTH_NAMES[upper] !== undefined) {
    return MONTH_NAMES[upper];
  }

  // Day of week names
  if (def.name === 'dayOfWeek') {
    if (DOW_NAMES[upper] !== undefined) {
      return cronType === 'quartz' ? QUARTZ_DOW_NAMES[upper] : DOW_NAMES[upper];
    }
  }

  // Number parsing
  if (!/^\d+$/.test(tokenStr)) {
    throw new CronValidationError({
      message: `Invalid value '${tokenStr}' for ${def.name} field.`,
      expression: originalExpression,
      fieldIndex,
      fieldName: def.name,
      startCol,
      endCol,
    });
  }

  const num = parseInt(tokenStr, 10);
  let min = def.min;
  let max = def.max;

  // Day of week bounds
  if (def.name === 'dayOfWeek') {
    if (cronType === 'quartz') {
      min = 1;
      max = 7;
    } else {
      min = 0;
      max = 7; // Unix accepts 0 or 7 for Sunday
    }
  }

  if (num < min || num > max) {
    throw new CronValidationError({
      message: `${capitalize(def.name)} '${tokenStr}' is out of range (${min}-${max}).`,
      expression: originalExpression,
      fieldIndex,
      fieldName: def.name,
      startCol,
      endCol,
    });
  }

  return num;
}

/**
 * Resolve day-of-week for Quartz special expressions (e.g. 5L, FRI#3).
 */
function resolveDowValue(valStr, cronType, originalExpression, fieldIndex, startCol, endCol) {
  const upper = valStr.toUpperCase();
  if (DOW_NAMES[upper] !== undefined) {
    return cronType === 'quartz' ? QUARTZ_DOW_NAMES[upper] : DOW_NAMES[upper];
  }
  if (!/^\d+$/.test(valStr)) {
    throw new CronValidationError({
      message: `Invalid day-of-week '${valStr}'.`,
      expression: originalExpression,
      fieldIndex,
      fieldName: 'dayOfWeek',
      startCol,
      endCol,
    });
  }
  const n = parseInt(valStr, 10);
  const min = cronType === 'quartz' ? 1 : 0;
  const max = 7;
  if (n < min || n > max) {
    throw new CronValidationError({
      message: `Day-of-Week '${valStr}' is out of range (${min}-${max}).`,
      expression: originalExpression,
      fieldIndex,
      fieldName: 'dayOfWeek',
      startCol,
      endCol,
    });
  }
  return n;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
