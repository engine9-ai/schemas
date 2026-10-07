import schema from './schema.js';

const metadata = {
  name: '@engine9/schemas/transaction/contact_details',
  dependencies: {
    '@engine9/schemas/transaction/core': '>=1.9.0'
  }
};

export { metadata, schema };
export default { metadata, schema };
