function sourceCodeCondition(sourceCode) {
  const value = String(sourceCode);
  const type = value.includes('%') ? 'LIKE' : 'EQUALS';
  return {
    type,
    values: [{ ref: { column: 'source_code' } }, { value: { value } }]
  };
}

/**
 * People with at least one timeline entry whose source_code matches.
 *
 * Options:
 * - sourceCode: exact code, or LIKE pattern when it contains %
 */
export const sourceCode = {
  title: 'Timeline source code',
  description:
    'People with a timeline entry credited to a source code. Exact match, or a LIKE pattern when the value contains %.',
  form: {
    title: 'Timeline source code',
    type: 'object',
    properties: {
      sourceCode: {
        title: 'Source code',
        description: 'Exact source code, or a LIKE pattern when it contains %',
        type: 'string'
      }
    },
    required: ['sourceCode']
  },
  optionsToEQL(options = {}) {
    const { sourceCode: code } = options;
    if (!code) throw new Error('sourceCode is required');
    const matchLabel = String(code).includes('%') ? 'matching ' : '';
    return {
      text: `Has a timeline entry with source code ${matchLabel}${code}`,
      eql: {
        table: 'timeline',
        columns: ['person_id'],
        joins: [
          {
            table: 'source_code_dictionary',
            join_eql: 'timeline.source_code_id=source_code_dictionary.source_code_id'
          }
        ],
        conditions: [sourceCodeCondition(code)]
      }
    };
  }
};

export const segmentDefinitionClauses = { sourceCode };
export default {
  segmentDefinitionClauses
};
