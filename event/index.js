import schema from './schema.js';
import search from './search.js';

const metadata = {
  name: '@engine9/schemas/event',
  dependencies: {
    '@engine9/schemas/person': '>=1.9.0'
  },
  schemas: ['schema.js']
};

export { metadata, schema, search };
export default {
  metadata,
  schema,
  search
};
