/*
  person_login (1.15.0): turn sign-in on for a database that signs people
  in, and copy today's role holders into the table, so every admin keeps
  signing in as before.

  Sign-in is a plugin of its own. A data-only database never signs anyone
  in, so it has no person_login and this upgrade leaves it alone. It runs
  while the table is missing and the database signs people in, which is:

    - the site's config has sign-in (POST /admin/upgrade passes sign_in);
    - someone holds a role (the account has a `roles` plugin row), or
      role_segments names segments;
    - the contact edition is installed (it includes this plugin);
    - or the run names this plugin: `e9core upgrade --plugin
      @engine9/schemas/login` turns sign-in on for an existing database.

  Existing data is trusted: every address a role holder has (person_email,
  and person_hash_email on PII-free accounts) becomes an active `backfill`
  login on that person. An address two role holders share is written for
  neither and reported as a conflict. A role holder with no address (a
  Facebook or Microsoft sign-in without a verified email) is reported; the
  identifier store keeps no list of subjects by person, so that login is made
  at their next sign-in and an admin links it.

  Role holders are the members of segments made by the account's `roles`
  plugin, plus `role_segments` (ids; POST /admin/upgrade passes the site's
  configured roles).

  `backfill_logins` runs the copy again on a table that exists (status says
  when: role holders with no login, such as after a plain `e9core install`
  of this plugin). Re-running inserts only missing rows and never touches a
  locked or retired login.

  Core switches sign-in to the table as soon as it exists. An admin who signs
  in between the table's creation and the copy gets an `adopted` login; the
  copy turns adopted logins on role holders into `backfill` ones.

  shouldUpgrade reads the schema snapshot, the plugin rows, and the options
  only (core docs/plugin-upgrades.md).
*/
import nodecrypto from 'node:crypto';

const { createHash } = nodecrypto;

export const LOGIN_PATH = '@engine9/schemas/login';
const CONTACT_EDITION_PATH = '@engine9/schemas/editions/contact';

export const PERSON_LOGIN_TABLE = 'person_login';
const ROLES_PLUGIN_PATH = 'roles';
const IN_CHUNK = 90; // D1 binds at most 100 values per statement
const INSERT_ROWS = 25;

const sha256Hex = (value) => createHash('sha256').update(String(value), 'utf8').digest('hex');
const normalizeAddress = (value) => String(value ?? '').trim().toLowerCase();

async function tableExists(worker, table) {
  try {
    await worker.describe({ table });
    return true;
  } catch (e) {
    if (e?.code === 'DOES_NOT_EXIST') return false;
    throw e;
  }
}

function chunks(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

const marks = (n) => new Array(n).fill('?').join(',');

function roleSegmentOption(options = {}) {
  const raw = options.role_segments ?? options.roleSegments ?? options.role_segment ?? options.roleSegment;
  if (raw == null || raw === true) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(',');
  return [...new Set(list.map((s) => String(s).trim()).filter(Boolean))];
}

async function roleHolders(worker, extraSegments) {
  if (!(await tableExists(worker, 'person_segment')) || !(await tableExists(worker, 'segment'))) return [];
  const ids = new Set();
  const { data } = await worker.query({
    sql: `select distinct ps.person_id from person_segment ps
      join segment s on s.id=ps.segment_id
      join plugin p on p.id=s.plugin_id
      where p.path=?`,
    values: [ROLES_PLUGIN_PATH]
  });
  data.forEach((r) => ids.add(Number(r.person_id)));
  for (const part of chunks(extraSegments, IN_CHUNK)) {
    const { data: more } = await worker.query({
      sql: `select distinct person_id from person_segment where segment_id in (${marks(part.length)})`,
      values: part
    });
    more.forEach((r) => ids.add(Number(r.person_id)));
  }
  return [...ids].filter((id) => Number.isFinite(id)).sort((a, b) => a - b);
}

/* hash -> { personIds: Set, address } for every address of these people. */
async function addressesOf(worker, personIds) {
  const byHash = new Map();
  const add = (hash, personId, address) => {
    if (!hash) return;
    if (!byHash.has(hash)) byHash.set(hash, { personIds: new Set(), address: null });
    const entry = byHash.get(hash);
    entry.personIds.add(Number(personId));
    if (address && !entry.address) entry.address = address;
  };
  const hasEmail = await tableExists(worker, 'person_email');
  const hasHash = await tableExists(worker, 'person_hash_email');
  for (const part of chunks(personIds, IN_CHUNK)) {
    if (hasEmail) {
      const { data } = await worker.query({
        sql: `select person_id, email from person_email where person_id in (${marks(part.length)})`,
        values: part
      });
      for (const r of data) {
        const address = normalizeAddress(r.email);
        if (address.length >= 5) add(sha256Hex(address), r.person_id, address);
      }
    }
    if (hasHash) {
      const { data } = await worker.query({
        sql: `select person_id, email_hash_v1 from person_hash_email where person_id in (${marks(part.length)})`,
        values: part
      });
      for (const r of data) add(String(r.email_hash_v1 || '').toLowerCase() || null, r.person_id, null);
    }
  }
  return byHash;
}

async function existingEmailLogins(worker, hashes) {
  const found = new Map();
  for (const part of chunks(hashes, IN_CHUNK)) {
    const { data } = await worker.query({
      sql: `select value_hash, person_id, how, state from ${PERSON_LOGIN_TABLE} where type='email' and value_hash in (${marks(part.length)})`,
      values: part
    });
    data.forEach((r) => found.set(r.value_hash, r));
  }
  return found;
}

async function insertBackfillRows(worker, rows) {
  let written = 0;
  for (const part of chunks(rows, INSERT_ROWS)) {
    const sql = `insert into ${PERSON_LOGIN_TABLE} (type, value_hash, person_id, how, state)
      values ${part.map(() => "('email', ?, ?, 'backfill', 'active')").join(', ')}`;
    try {
      await worker.query({ sql, values: part.flatMap((r) => [r.hash, r.personId]) });
      written += part.length;
    } catch (e) {
      // Someone signed in while this ran and wrote one of these rows first.
      const now = await existingEmailLogins(worker, part.map((r) => r.hash));
      for (const r of part.filter((x) => !now.has(x.hash))) {
        await worker.query({
          sql: `insert into ${PERSON_LOGIN_TABLE} (type, value_hash, person_id, how, state) values ('email', ?, ?, 'backfill', 'active')`,
          values: [r.hash, r.personId]
        });
        written += 1;
      }
      if (!part.some((r) => now.has(r.hash))) throw e;
    }
  }
  return written;
}

export async function backfillPersonLogin({ sqlWorker: worker, options = {}, dryRun }) {
  const tablePresent = await tableExists(worker, PERSON_LOGIN_TABLE);
  if (!(await tableExists(worker, 'person'))) return { pending: false, changed: false, skipped: 'no person table' };
  const holders = await roleHolders(worker, roleSegmentOption(options));
  const byHash = await addressesOf(worker, holders);
  const existing = tablePresent ? await existingEmailLogins(worker, [...byHash.keys()]) : new Map();

  const toWrite = [];
  const conflicts = [];
  const withAddress = new Set();
  for (const [hash, entry] of byHash) {
    const ids = [...entry.personIds];
    if (ids.length > 1) {
      conflicts.push({ ...(entry.address ? { email: entry.address } : { email_hash_v1: hash }), person_ids: ids.sort((a, b) => a - b) });
      continue;
    }
    withAddress.add(ids[0]);
    if (!existing.has(hash)) toWrite.push({ hash, personId: ids[0] });
  }
  const noAddress = holders.filter((id) => !withAddress.has(id) && ![...byHash.values()].some((e) => e.personIds.has(id)));
  // Adopted logins on role holders: made by a sign-in during this upgrade.
  let adopted = 0;
  if (tablePresent && holders.length) {
    for (const part of chunks(holders, IN_CHUNK)) {
      const { data } = await worker.query({
        sql: `select count(*) as n from ${PERSON_LOGIN_TABLE} where how='adopted' and person_id in (${marks(part.length)})`,
        values: part
      });
      adopted += Number(data[0]?.n || 0);
    }
  }

  const pending = !tablePresent || toWrite.length > 0 || adopted > 0;
  const plan = [];
  if (!tablePresent) plan.push(`create ${PERSON_LOGIN_TABLE}`);
  if (toWrite.length) plan.push(`copy ${toWrite.length} address${toWrite.length === 1 ? '' : 'es'} of ${withAddress.size} role holder${withAddress.size === 1 ? '' : 's'} into ${PERSON_LOGIN_TABLE}`);
  if (adopted) plan.push(`mark ${adopted} login${adopted === 1 ? '' : 's'} on role holders as backfill`);
  const result = {
    pending,
    plan,
    role_holders: holders.length,
    addresses: toWrite.length,
    conflicts,
    no_address: noAddress
  };
  if (dryRun) return { ...result, dry_run: true };
  if (!pending) return { ...result, changed: false };

  if (!tablePresent) await worker.install({ path: LOGIN_PATH, unique: true, trigger: 'upgrade' });
  const written = await insertBackfillRows(worker, toWrite);
  for (const part of chunks(holders, IN_CHUNK)) {
    await worker.query({
      sql: `update ${PERSON_LOGIN_TABLE} set how='backfill' where how='adopted' and person_id in (${marks(part.length)})`,
      values: part
    });
  }
  return { ...result, changed: true, written };
}

const truthy = (v) => v === true || v === 1 || v === 'true' || v === '1';
const truthyOption = (options, ...names) => names.some((n) => truthy(options?.[n]));

/* Whether this run names this plugin (e9core upgrade --plugin @engine9/schemas/login). */
function namedInRun(options = {}) {
  return [].concat(options.plugins || [])
    .flatMap((p) => String(p).split(','))
    .some((p) => p.trim() === LOGIN_PATH);
}

/* Whether the database signs people in (see the comment at the top). */
async function signsPeopleIn(worker, options = {}) {
  if (truthyOption(options, 'sign_in', 'signIn') || namedInRun(options) || roleSegmentOption(options).length) return true;
  const { data } = await worker.query({
    sql: 'select count(*) as n from plugin where path in (?, ?, ?)',
    values: [ROLES_PLUGIN_PATH, CONTACT_EDITION_PATH, LOGIN_PATH]
  });
  return Number(data[0]?.n || 0) > 0;
}

export const upgrades = [
  {
    id: 'person_login',
    since: '1.15.0',
    description:
      'Turn sign-in on: create person_login (who can sign in, as which person) and copy every role holder\'s addresses into it, so admins keep signing in as before.',
    options: {
      sign_in: 'The site signs people in (POST /admin/upgrade passes it when the site has sign-in).',
      role_segments: 'Segment ids whose members are role holders, besides the roles plugin\'s segments (comma separated).',
      backfill_logins: 'Copy role holders\' addresses again, for a table that was created without this upgrade.'
    },
    shouldUpgrade: async ({ sqlWorker, snapshot, options }) => {
      if (!snapshot.hasTable('person')) return false;
      if (snapshot.hasTable(PERSON_LOGIN_TABLE)) return truthyOption(options, 'backfill_logins', 'backfillLogins');
      return signsPeopleIn(sqlWorker, options);
    },
    run: backfillPersonLogin
  }
];
