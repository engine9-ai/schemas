import schema from './schema.js';

const metadata = {
  name: '@engine9/schemas/segment_stats',
  schemas: ['schema.js'],
  dependencies: {
    '@engine9/schemas/segment': '>=1.9.0'
  }
};

export { metadata };
export { schema };
export default {
  metadata,
  schema
};
