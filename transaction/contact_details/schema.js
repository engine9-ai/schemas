// Contact details captured on a transaction: payer name, address, email, phone, employer, and occupation.
export const tables = [
  {
    name: 'transaction',
    prefix: false,
    columns: {
      given_name: 'string',
      family_name: 'string',
      street_1: 'string',
      street_2: 'string',
      city: 'string',
      region: 'string',
      postal_code: { type: 'string', length: 16 },
      country: 'string',
      email: 'string',
      phone: { type: 'string', length: 24 },
      employer: 'string',
      occupation: 'string'
    },
    indexes: []
  }
];

export default { tables };
