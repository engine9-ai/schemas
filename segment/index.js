import schema from './schema.js';
import { segmentDefinitionClauses } from './segmentDefinitionClauses.js';
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
export { segmentDefinitionClauses };
export default {
  metadata,
  schema,
  segmentDefinitionClauses,
  transforms
};
