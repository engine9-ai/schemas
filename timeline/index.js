import schema from './schema.js';
import upsert from './transforms/inbound/upsert_tables.js';
import { segmentDefinitionClauses } from './segmentDefinitionClauses.js';
const metadata = {
  name: '@engine9/schemas/timeline',
  dependencies: {
    '@engine9/schemas/person': '>=1.9.0',
    '@engine9/schemas/source_code': '>=1.9.0'
  }
};
export const transforms = {
  upsert
};
export { metadata };
export { schema };
export { segmentDefinitionClauses };
export default {
  metadata,
  schema,
  transforms,
  segmentDefinitionClauses
};
