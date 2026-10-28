import schema from './schema.js';
import { settings } from './settings.js';
import { upgrades, UPGRADE_FROM as upgradeFrom } from './upgrades.js';
const metadata = {
  name: '@engine9/schemas/plugin'
};
export { metadata };
export { schema };
export { settings };
export { upgrades, upgradeFrom };
export default {
  metadata,
  schema,
  settings,
  // Run by @engine9/core's e9core upgrade and checked by e9core status, never on install or a request.
  upgrades,
  upgradeFrom
};
