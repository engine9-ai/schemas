import search from './search.js';
import segments, { personSegmentTableName, universeEmailPublished90d } from './segments.js';

const metadata = {
  name: '@engine9/schemas/channels/email',
  dependencies: {
    '@engine9/schemas/person': '>=1.9.0'
  }
};

export { metadata };
export { search };
export { segments };
export { personSegmentTableName };
export { universeEmailPublished90d };
export default {
  metadata,
  search,
  segments,
  personSegmentTableName,
  universeEmailPublished90d
};
