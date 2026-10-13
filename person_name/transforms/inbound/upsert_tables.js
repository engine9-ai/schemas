import { mergeIntoQueue } from '@engine9/input-tools';

export const type = 'upsert';
export const description =
  'Upsert given_name / family_name into person_name, one row per person. A name key that is absent keeps the stored value; an explicit null clears it.';
export const bindings = {
  databaseNames: { path: 'sql.query', options: { table: 'person_name', lookup: ['person_id'] } },
  tablesToUpsert: { path: 'sql.tables.upsert' }
};

const NAME_COLUMNS = ['given_name', 'family_name'];

// person_id may arrive as number or string from different pipeline stages
const personKey = (field, value) => (value == null ? '' : String(value));

function mergeName(existing, incoming) {
  return {
    ...existing,
    ...incoming,
    person_id: existing.person_id,
    source_input_id: existing.source_input_id ?? incoming.source_input_id
  };
}

export async function transform({ batch, databaseNames = [], tablesToUpsert }) {
  if (batch.length === 0) return;
  const queue = [];
  batch.forEach((o) => {
    const present = NAME_COLUMNS.filter((column) => Object.hasOwn(o, column));
    if (present.length === 0) return;
    if (!o.person_id) throw new Error('Cannot update name, no person_id');
    const row = { person_id: o.person_id, source_input_id: o.input_id ?? null };
    for (const column of present) row[column] = o[column];
    mergeIntoQueue(queue, row, {
      keyFields: ['person_id'],
      normalizeField: personKey,
      merge: mergeName,
      label: 'person_name'
    });
  });
  if (queue.length === 0) return;
  // Every queued row carries every column (upsertArray rejects mixed key sets),
  // so a name the batch did not mention is filled from the stored row.
  const stored = new Map(databaseNames.map((row) => [String(row.person_id), row]));
  tablesToUpsert.person_name = tablesToUpsert.person_name || [];
  for (const row of queue) {
    const existing = stored.get(String(row.person_id));
    const full = {
      person_id: row.person_id,
      source_input_id: existing?.source_input_id ?? row.source_input_id
    };
    for (const column of NAME_COLUMNS) {
      full[column] = Object.hasOwn(row, column) ? row[column] : (existing?.[column] ?? null);
    }
    tablesToUpsert.person_name.push(full);
  }
}
export default {
  bindings,
  type,
  description,
  transform
};
