/*
  An edition: a plugin with no tables of its own whose include list names the
  plugins a kind of site adds to the required ones. Installing it installs
  them; e9core upgrade reinstalls it, so a plugin the edition gains later
  reaches every database that has it. The list lives in plugin.json, which
  build-plugins reads to bundle the included plugins.
*/
import edition from './plugin.json' with { type: 'json' };

const metadata = { ...edition };
const include = edition.include;

export { metadata, include };
export default { metadata };
