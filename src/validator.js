import { parseCron } from './parser.js';
import { CronValidationError } from './errors.js';

/**
 * Validate a cron expression.
 *
 * @param {string} expression The cron expression to validate.
 * @param {Object} [options]
 * @param {boolean} [options.throwOnError=false] Whether to throw on invalid expression.
 * @param {'auto' | 'unix' | 'quartz'} [options.type='auto']
 * @returns {{ valid: boolean, error: CronValidationError | null, visualMarker: string | null, parsed: Object | null }}
 */
export function validateCron(expression, options = {}) {
  const { throwOnError = false, ...parseOptions } = options;
  try {
    const parsed = parseCron(expression, parseOptions);
    return {
      valid: true,
      error: null,
      visualMarker: null,
      parsed,
    };
  } catch (err) {
    if (err instanceof CronValidationError) {
      if (throwOnError) throw err;
      return {
        valid: false,
        error: err,
        visualMarker: err.formatVisualMarker(),
        parsed: null,
      };
    }
    if (throwOnError) throw err;
    const genericErr = new CronValidationError({
      message: err.message,
      expression: String(expression ?? ''),
    });
    return {
      valid: false,
      error: genericErr,
      visualMarker: genericErr.formatVisualMarker(),
      parsed: null,
    };
  }
}
