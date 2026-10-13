export const names = {
  title: 'Names',
  form: {
    title: 'Names',
    type: 'object',
    properties: {
      givenName: {
        title: 'First Name',
        type: 'string'
      },
      familyName: {
        title: 'Last Name',
        type: 'string'
      }
    },
    required: []
  },
  optionsToEQL(options) {
    const { givenName = '', familyName = '' } = options;
    const text = [];
    const conditions = [];
    if (givenName.length > 0) {
      text.push(`First name like '${givenName}'`);
      conditions.push({
        type: 'LIKE',
        values: [{ ref: { column: 'given_name' } }, { value: { value: givenName } }]
      });
    }
    if (familyName.length > 0) {
      text.push(`Last name like '${familyName}'`);
      conditions.push({
        type: 'LIKE',
        values: [{ ref: { column: 'family_name' } }, { value: { value: familyName } }]
      });
    }
    return {
      text: text.length ? text.join(' and ') : 'Has a name',
      eql: {
        table: 'person_name',
        conditions
      }
    };
  }
};
export default {
  names
};
