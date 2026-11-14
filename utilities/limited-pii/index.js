import { settings } from './settings.js';

const metadata = {
  name: '@engine9/schemas/utilities/limited-pii',
  description:
    'On-demand PII controls: exclude_pii is the account PII-free setting (installs, imports, exports, reports). It refuses plaintext contact plugins; it installs nothing and does not choose an edition.',
  unique: true
};

export { metadata, settings };
export default {
  metadata,
  settings
};
