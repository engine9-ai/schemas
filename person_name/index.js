import schema from './schema.js';
import upsertPersonName from './transforms/inbound/upsert_tables.js';
import appendName from './transforms/outbound/appendName.js';
import { segmentDefinitionClauses } from './segmentDefinitionClauses.js';
const metadata = {
  name: '@engine9/schemas/person_name',
  unique: true,
  dependencies: {
    '@engine9/schemas/person': '>=1.9.0'
  },
  // Inbound people pipeline slots -> transform export keys (woven by core when installed)
  inbound: {
    upsert: ['upsertPersonName']
  }
};
export const transforms = {
  upsertPersonName,
  appendName
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
