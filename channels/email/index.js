import { segmentDefinitionClauses } from './segmentDefinitionClauses.js';
import segments, { personSegmentTableName, universeEmailPublished90d } from './segments.js';

const metadata = {
  name: '@engine9/schemas/channels/email',
  dependencies: {
    '@engine9/schemas/person': '>=1.9.0'
  }
};

export { metadata };
export { segmentDefinitionClauses };
export { segments };
export { personSegmentTableName };
export { universeEmailPublished90d };
export default {
  metadata,
  segmentDefinitionClauses,
  segments,
  personSegmentTableName,
  universeEmailPublished90d
};
