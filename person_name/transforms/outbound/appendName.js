export const description = 'Append a name';
export const bindings = {
  names: {
    path: 'sql.query',
    options: {
      table: 'person_name',
      columns: ['person_id', 'given_name', 'family_name'],
      lookup: ['person_id'],
      optional: true
    }
  }
};
export const transform = ({ batch, names }) => {
  const nameMap = names.reduce((a, b) => {
    a[b.person_id] = a[b.person_id] || b;
    return a;
  }, {});
  batch.forEach((data) => {
    const o = nameMap[data.person_id] || {};
    data.given_name = o.given_name || null;
    data.family_name = o.family_name || null;
  });
};
export default {
  description,
  bindings,
  transform
};
