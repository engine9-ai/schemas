export const customers = {
  name: 'Customers',
  definition: {
    and: [
      {
        table: 'transaction',
        columns: ['person_id']
      }
    ]
  }
};
export default {
  customers
};
