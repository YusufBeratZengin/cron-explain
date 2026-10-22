/**
 * Error thrown when a cron expression violates syntax or boundary rules.
 */
export class CronValidationError extends Error {
  /**
   * @param {Object} options
   * @param {string} options.message - Human-readable error message.
   * @param {string} [options.expression=''] - The original cron expression string.
   * @param {number} [options.fieldIndex=-1] - Zero-based index of the invalid field.
   * @param {string} [options.fieldName=''] - Name of the invalid field.
   * @param {number} [options.startCol=0] - Character offset where the token starts.
   * @param {number} [options.endCol=0] - Character offset where the token ends.
   */
  constructor({
    message,
    expression = '',
    fieldIndex = -1,
    fieldName = '',
    startCol = 0,
    endCol = 0,
  }) {
    super(message);
    this.name = 'CronValidationError';
    this.expression = expression;
    this.fieldIndex = fieldIndex;
    this.fieldName = fieldName;
    this.startCol = Math.max(0, startCol);
    this.endCol = Math.max(this.startCol, endCol);
  }

  /**
   * Returns a formatted multi-line string showing the expression and a pointer caret (`^`).
   * @param {string} [indent='  '] Indentation for the output block.
   * @returns {string}
   */
  formatVisualMarker(indent = '  ') {
    if (!this.expression) {
      return `Invalid cron expression:\n${indent}${this.message}`;
    }

    const start = this.startCol;
    const length = Math.max(1, this.endCol - start);
    const pointer = ' '.repeat(start) + '^'.repeat(length);

    return [
      'Invalid cron expression:',
      `${indent}${this.expression}`,
      `${indent}${pointer}`,
      this.message,
    ].join('\n');
  }
}
