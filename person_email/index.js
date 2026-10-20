import schema from './schema.js';
import extractEmailHashes from './transforms/inbound/extract_identifiers.js';
import upsertPersonEmail from './transforms/inbound/upsert_tables.js';
import { segmentDefinitionClauses } from './segmentDefinitionClauses.js';
import appendEmail from './transforms/outbound/appendEmail.js';
import appendEmailHash from './transforms/outbound/appendEmailHash.js';
import segments from './segments.js';
const metadata = {
  name: '@engine9/schemas/person_email',
  dependencies: {
    '@engine9/schemas/person': '>=1.9.0'
  },
  // Inbound people pipeline slots -> transform export keys (woven by core when installed)
  inbound: {
    id: ['extractEmailHashes'],
    upsert: ['upsertPersonEmail']
  }
};
export const transforms = {
  extractEmailHashes,
  upsertPersonEmail,
  appendEmail,
  appendEmailHash
};
export { metadata };
export { schema };
export { segmentDefinitionClauses };
export { segments };
export default {
  metadata,
  schema,
  segmentDefinitionClauses,
  segments,
  transforms
};
