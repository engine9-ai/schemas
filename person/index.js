import schema from './schema.js';
import upsertPerson from './transforms/inbound/upsert_tables.js';
import normalizeFieldNames from './transforms/inbound/normalize_field_names.js';
import simpleMap from './transforms/simpleMap.js';
import appendName from '../person_name/transforms/outbound/appendName.js';
import metrics from './metrics.js';
const metadata = {
  name: '@engine9/schemas/person',
  schemas: ['schema.js'],
  // Inbound people pipeline slots -> transform export keys (woven by core when installed)
  inbound: {
    normalize: ['normalizeFieldNames']
  }
};
const transforms = {
  normalizeFieldNames,
  // Not woven. Plugin rows installed before person_name still name it in their
  // inbound snapshot until the person_name upgrade refreshes that snapshot.
  upsertPerson,
  simpleMap,
  // Saved export definitions still call @engine9/schemas/person:transforms:appendName.
  appendName
};
const person = {
    title: 'Ids',
    form: {
      title: 'Ids',
      type: 'object',
      properties: {
        ids: {
          title: 'Person Ids (comma delimited)',
          type: 'string'
        },
        idGreaterThanEqual: {
          title: 'ID Greater than or equal to',
          type: 'number'
        },
        idLessThan: {
          title: 'ID less than',
          type: 'number'
        }
      },
      required: []
    },
    optionsToEQL: (options) => {
      const text = [];
      const { ids, idGreaterThanEqual, idLessThan } = options;
      const conditions = [];
      if (ids) {
        let arr = ids || '';
        if (typeof ids === 'string') arr = ids.split(',');
        if (arr.length === 0) arr = [0];
        conditions.push({ eql: `id in (${arr.map((p) => parseInt(p, 10)).join(',')})` });
        text.push(`Person ID in ${arr.map((p) => parseInt(p, 10)).join(',')}`);
      }
      if (idGreaterThanEqual) {
        conditions.push({ eql: `id>=${idGreaterThanEqual}` });
        text.push(`Person ID greater or equal to ${idGreaterThanEqual}`);
      }
      if (idLessThan) {
        conditions.push({ eql: `id<${idLessThan}` });
        text.push(`Person ID less than ${idLessThan}`);
      }
      return {
        text,
        eql: {
          table: 'person',
          columns: ['id'],
          conditions
        }
      };
    }
  };
export const segmentDefinitionClauses = { person };
export { metadata };
export { schema };
export { transforms };
export { metrics };
export default {
  metadata,
  schema,
  transforms,
  metrics,
  segmentDefinitionClauses
};
