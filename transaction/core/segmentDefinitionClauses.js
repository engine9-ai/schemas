import { relativeDate, isValidDate } from '@engine9/input-tools';

function blank(value) {
  return value == null || String(value).trim() === '';
}

function amountOption(name, value) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid ${name}: ${value}`);
  return n;
}

export const all = {
  title: 'Transactions',
  form: {
    title: 'Transactions',
    type: 'object',
    properties: {
      plugin_id: {
        title: 'Plugin',
        type: 'string',
        resolveOptionsUsing: 'plugin'
      },
      start: {
        title: 'Start',
        type: 'string',
        description:
          "Optional; only include rows with ts >= start. Parsed with relativeDate; supports ISO datetimes or relative expressions like '-30d'."
      },
      end: {
        title: 'End',
        type: 'string',
        description:
          'Optional; only include rows with ts < end (exclusive upper bound). Parsed with relativeDate; supports ISO datetimes or relative expressions.'
      },
      minAmount: {
        title: 'Minimum amount',
        type: 'number',
        description: 'Optional; only include rows with amount >= minAmount.'
      },
      maxAmount: {
        title: 'Maximum amount',
        type: 'number',
        description: 'Optional; only include rows with amount <= maxAmount.'
      }
    },
    required: []
  },
  optionsToEQL: (options) => {
    const { plugin_id, start, end, minAmount, maxAmount } = options;
    const conditions = [];
    let text = 'Has any transactions';
    if (plugin_id) {
      conditions.push(`input.plugin_id='${plugin_id}'`);
      text += ` from plugin ${plugin_id}`;
    }
    if (start) {
      const s = relativeDate(start);
      if (!isValidDate(s)) throw new Error('Invalid start: ' + start);
      conditions.push(`transaction.ts>='${s.toISOString()}'`);
      text += ` with ts >= ${s.toISOString()}`;
    }
    if (end) {
      const e = relativeDate(end);
      if (!isValidDate(e)) throw new Error('Invalid end: ' + end);
      conditions.push(`transaction.ts<'${e.toISOString()}'`);
      text += ` with ts < ${e.toISOString()}`;
    }
    if (!blank(minAmount)) {
      const min = amountOption('minAmount', minAmount);
      conditions.push(`transaction.amount>=${min}`);
      text += ` with amount >= ${min}`;
    }
    if (!blank(maxAmount)) {
      const max = amountOption('maxAmount', maxAmount);
      conditions.push(`transaction.amount<=${max}`);
      text += ` with amount <= ${max}`;
    }
    return {
      text,
      eql: {
        table: 'transaction',
        joins: [
          {
            table: 'input',
            join_eql: 'transaction.input_id=input.id'
          }
        ],
        columns: ['person_id'],
        conditions
      }
    };
  }
};
export const segmentDefinitionClauses = { all };
export default {
  segmentDefinitionClauses
};
