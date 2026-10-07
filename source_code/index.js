import schema from './schema.js';
import metrics from './metrics.js';
const metadata = {
  name: '@engine9/schemas/source_code',
  dependencies: {
    '@engine9/schemas/person': '>=1.9.0'
  }
};
export { metadata };
export { schema };
export { metrics };
export default {
  metadata,
  schema,
  metrics
};
