import schema from './schema.js';
import upsert from './transforms/inbound/upsert_tables.js';
const metadata = {
  name: '@engine9/schemas/timeline',
  dependencies: {
    '@engine9/schemas/person': '>=1.9.0'
  }
};
export const transforms = {
  upsert
};
export { metadata };
export { schema };
export default {
  metadata,
  schema,
  transforms
};
