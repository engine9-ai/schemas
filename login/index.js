/*
  Sign-in: who can sign in to a site built with @engine9/core, and as which
  person (person_login). A site that signs people in adds this plugin on
  purpose; a data-only database leaves it out. No edition includes it.

  Turn sign-in on for an existing database with
  `npx e9core upgrade --plugin @engine9/schemas/login`, which creates the
  table and copies today's role holders into it (./upgrades.js). A plain
  `e9core install` creates an empty table.
*/
import schema from './schema.js';
import { upgrades } from './upgrades.js';
import { UPGRADE_FROM as upgradeFrom } from '../plugin/upgrades.js';

const metadata = {
  name: '@engine9/schemas/login',
  description: 'Sign-in: who can sign in, and as which person (person_login). Hashes only, no contact details.',
  dependencies: {
    '@engine9/schemas/person': '>=1.9.0'
  },
  schemas: ['schema.js']
};

export { metadata, schema, upgrades, upgradeFrom };
export default {
  metadata,
  schema,
  // Run by @engine9/core's e9core upgrade and checked by e9core status, never on install or a request.
  upgrades,
  upgradeFrom
};
