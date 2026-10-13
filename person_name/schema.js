export const tables = [
  {
    name: 'person_name',
    columns: {
      person_id: 'person_id',
      given_name: 'string',
      family_name: 'string',
      source_input_id: 'foreign_uuid',
      created_at: 'created_at',
      modified_at: 'modified_at'
    },
    indexes: [{ columns: ['person_id'], primary: true }]
  }
];
export default {
  tables
};
