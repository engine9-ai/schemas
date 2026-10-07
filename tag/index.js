import schema from './schema.js';
const metadata = {
  name: '@engine9/schemas/tag',
  dependencies: {
    '@engine9/schemas/person': '>=1.9.0'
  }
};
export { metadata };
export { schema };
export default {
  metadata,
  schema
};
