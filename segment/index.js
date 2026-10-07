import schema from './schema.js';
import search from './search.js';
import upsert from './transforms/inbound/upsert.js';
const metadata = {
  name: '@engine9/schemas/segment',
  dependencies: {
    '@engine9/schemas/person': '>=1.9.0'
  }
};
export const transforms = {
  upsert
};
export { metadata };
export { schema };
export { search };
export default {
  metadata,
  schema,
  search,
  transforms
};
