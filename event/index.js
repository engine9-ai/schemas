import schema from './schema.js';
import { segmentDefinitionClauses } from './segmentDefinitionClauses.js';

const metadata = {
  name: '@engine9/schemas/event',
  dependencies: {
    '@engine9/schemas/person': '>=1.9.0'
  },
  schemas: ['schema.js']
};

export { metadata, schema, segmentDefinitionClauses };
export default {
  metadata,
  schema,
  segmentDefinitionClauses
};
