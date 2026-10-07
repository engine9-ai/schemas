import schema from './schema.js';
import search from './search.js';
import metrics from './metrics.js';
import segments from './segments.js';
import upsert from './transforms/inbound/upsert_tables.js';
import attribute from './transforms/attribute.js';
import appendTransactionSummary from './transforms/appendTransactionSummary.js';
const metadata = {
  name: '@engine9/schemas/transaction/core',
  dependencies: {
    '@engine9/schemas/person': '>=1.9.0'
  }
};
export const transforms = {
  upsert,
  attribute,
  appendTransactionSummary
};
export { metadata };
export { schema };
export { metrics };
export { search };
export { segments };
export default {
  metadata,
  schema,
  metrics,
  transforms,
  search,
  segments
};
