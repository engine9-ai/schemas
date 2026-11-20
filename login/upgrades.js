/*
  person_login (1.15.0): turn sign-in on for a database that signs people
  in, and copy into it the logins people already have, so they keep signing
  in as the same person.

  Sign-in is a plugin of its own. A data-only database never signs anyone
  in, so it has no person_login and this upgrade leaves it alone. It runs
  while the table is missing and the database signs people in, which is:

    - the site's config has sign-in (POST /admin/upgrade passes sign_in);
    - someone holds a role (the account has a `roles` plugin row), or
      role_segments names segments;
    - or the run names this plugin: `e9core upgrade --plugin
      @engine9/schemas/login` turns sign-in on for an existing database.

  No edition includes this plugin: a site adds it on purpose.

  From this release on, a first sign-in with no login is a new person: it
  never finds a record by its address. So this copy is the one time
  existing addresses become logins. It copies, as active `backfill` email
  logins on the person that holds the address (person_email, and
  person_hash_email on PII-free accounts):

    - every address of a role holder (members of segments made by the
      account's `roles` plugin, plus `role_segments`);
    - every address sign-in itself wrote: rows whose source_input_id is an
      input named `delegate` (or `sign_in_inputs`), so people who signed
      in before keep their record;
    - with `all_addresses`, every address on file. For a site whose people
      should all find their history at a first sign-in. Do this once, here:
      an address joined to a record later (a form, an import) is never a
      login until someone links it (core docs/merge-tools.md).

  An address on two records is written for neither and reported as a
  conflict. A Delegate account that signed in without an address is not
  copied (the identifier store keeps only hashes of Domain UNIDs): it is
  a new person at its next sign-in, and a role holder among them is listed
  (`no_address`, status `login.review`) for an admin to grant again.

  `backfill_logins` runs the copy again on a table that exists, for role
  holders who have no login at all (status says when, such as after a plain
  `e9core install` of this plugin). It never adds an address to someone
  who already signs in, and `all_addresses` is refused on a table that
  exists: an address joined to a record after sign-in was turned on is
  never a login until someone links it. Re-running inserts only missing
  rows and never touches an existing login.

  Core switches sign-in to the table as soon as it exists. A sign-in in the
  seconds between the table's creation and the copy makes a new, empty
  person; when this run created the table, the copy moves that login (and
  its Delegate account's login) to the person the copy names.

  shouldUpgrade reads the schema snapshot, the plugin rows, and the options
  only (core docs/plugin-upgrades.md).
*/
import nodecrypto from 'node:crypto';

const { createHash } = nodecrypto;

export const LOGIN_PATH = '@engine9/schemas/login';

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
      sql: `select value_hash, subject, person_id, how, state from ${PERSON_LOGIN_TABLE} where type='email' and value_hash in (${marks(part.length)})`,
      values: part
    });
    data.forEach((r) => found.set(r.value_hash, r));
  }
  return found;
}

function signInInputOption(options = {}) {
  const raw = options.sign_in_inputs ?? options.signInInputs;
  const list = raw == null || raw === true ? ['delegate'] : Array.isArray(raw) ? raw : String(raw).split(',');
  return [...new Set(list.map((s) => String(s).trim()).filter(Boolean))];
}

/* The input ids sign-in wrote under (input.remote_input_id is one of names). */
async function signInInputIds(worker, names) {
  if (!names.length || !(await tableExists(worker, 'input'))) return [];
  const { data } = await worker.query({
    sql: `select id from input where remote_input_id in (${marks(names.length)})`,
    values: names
  });
  return data.map((r) => r.id).filter(Boolean);
}

const PAGE = 1000;

/*
  Every address in person_email and person_hash_email, a page at a time:
  all of them, or (inputIds) only rows those inputs wrote.
*/
async function eachAddress(worker, { inputIds = null }, add) {
  if (inputIds && !inputIds.length) return;
  const where = inputIds ? `source_input_id in (${marks(inputIds.length)})` : '1=1';
  const bind = inputIds || [];
  if (await tableExists(worker, 'person_email')) {
    let after = 0;
    for (;;) {
      const { data } = await worker.query({
        sql: `select id, person_id, email from person_email where ${where} and id > ? order by id limit ${PAGE}`,
        values: [...bind, after]
      });
      for (const r of data) {
        const address = normalizeAddress(r.email);
        if (address.length >= 5) add(sha256Hex(address), r.person_id, address);
      }
      if (data.length < PAGE) break;
      after = data[data.length - 1].id;
    }
  }
  if (await tableExists(worker, 'person_hash_email')) {
    let after = [0, ''];
    for (;;) {
      const { data } = await worker.query({
        sql: `select person_id, email_hash_v1 from person_hash_email where ${where}
          and (person_id > ? or (person_id = ? and email_hash_v1 > ?)) order by person_id, email_hash_v1 limit ${PAGE}`,
        values: [...bind, after[0], after[0], after[1]]
      });
      for (const r of data) add(String(r.email_hash_v1 || '').toLowerCase() || null, r.person_id, null);
      if (data.length < PAGE) break;
      const last = data[data.length - 1];
      after = [last.person_id, last.email_hash_v1];
    }
  }
}

/* Inserts the rows; returns { written, taken: rows a sign-in wrote first }. */
async function insertBackfillRows(worker, rows) {
  let written = 0;
  const taken = [];
  for (const part of chunks(rows, INSERT_ROWS)) {
    const sql = `insert into ${PERSON_LOGIN_TABLE} (type, value_hash, person_id, how, state)
      values ${part.map(() => "('email', ?, ?, 'backfill', 'active')").join(', ')}`;
    try {
      await worker.query({ sql, values: part.flatMap((r) => [r.hash, r.personId]) });
      written += part.length;
    } catch (e) {
      // Someone signed in while this ran and wrote one of these rows first.
      const now = await existingEmailLogins(worker, part.map((r) => r.hash));
      if (!part.some((r) => now.has(r.hash))) throw e;
      for (const r of part) {
        if (now.has(r.hash)) {
          taken.push({ ...r, row: now.get(r.hash) });
          continue;
        }
        await worker.query({
          sql: `insert into ${PERSON_LOGIN_TABLE} (type, value_hash, person_id, how, state) values ('email', ?, ?, 'backfill', 'active')`,
          values: [r.hash, r.personId]
        });
        written += 1;
      }
    }
  }
  return { written, taken };
}

/*
  A sign-in during this run (the table was just created) made a new person
  for an address the copy names. Move its email login, and its Delegate
  account's login on that same new person, to the copy's person.
*/
async function moveLoginsMadeDuringRun(worker, taken) {
  let moved = 0;
  for (const { hash, personId, row } of taken) {
    if (row.how !== 'created' || Number(row.person_id) === personId) continue;
    await worker.query({
      sql: `update ${PERSON_LOGIN_TABLE} set person_id=?, how='backfill' where type='email' and value_hash=?`,
      values: [personId, hash]
    });
    if (row.subject) {
      await worker.query({
        sql: `update ${PERSON_LOGIN_TABLE} set person_id=? where type='delegate' and value_hash=? and person_id=?`,
        values: [personId, sha256Hex(normalizeAddress(row.subject)), row.person_id]
      });
    }
    moved += 1;
  }
  return moved;
}

const CONFLICTS_SHOWN = 50;

/* Role holders with no row in person_login. */
async function withoutLogins(worker, personIds) {
  const have = new Set();
  for (const part of chunks(personIds, IN_CHUNK)) {
    const { data } = await worker.query({
      sql: `select distinct person_id from ${PERSON_LOGIN_TABLE} where person_id in (${marks(part.length)})`,
      values: part
    });
    for (const r of data) have.add(Number(r.person_id));
  }
  return personIds.filter((id) => !have.has(Number(id)));
}

export async function backfillPersonLogin({ sqlWorker: worker, options = {}, dryRun }) {
  const tablePresent = await tableExists(worker, PERSON_LOGIN_TABLE);
  if (!(await tableExists(worker, 'person'))) return { pending: false, changed: false, skipped: 'no person table' };
  const holders = await roleHolders(worker, roleSegmentOption(options));
  // Once person_login exists, an address joined to a record later (a form,
  // by phone) is never a login until someone links it. Running the copy
  // again only fills in role holders who have no login at all, and every
  // address on file is copied only by the run that creates the table.
  const askedAll = truthyOption(options, 'all_addresses', 'allAddresses');
  const allAddresses = askedAll && !tablePresent;
  const copyFor = tablePresent ? await withoutLogins(worker, holders) : holders;

  const byHash = await addressesOf(worker, copyFor);
  const holderHashes = new Set(byHash.keys());
  const add = (hash, personId, address) => {
    if (!hash) return;
    if (!byHash.has(hash)) byHash.set(hash, { personIds: new Set(), address: null });
    const entry = byHash.get(hash);
    entry.personIds.add(Number(personId));
    if (address && !entry.address) entry.address = address;
  };
  if (allAddresses) await eachAddress(worker, {}, add);
  else await eachAddress(worker, { inputIds: await signInInputIds(worker, signInInputOption(options)) }, add);

  const existing = tablePresent ? await existingEmailLogins(worker, [...byHash.keys()]) : new Map();
  const toWrite = [];
  const conflicts = [];
  const withAddress = new Set();
  let fromHolders = 0;
  for (const [hash, entry] of byHash) {
    const ids = [...entry.personIds];
    if (existing.has(hash)) {
      // Already a login: nothing to copy, whichever records hold the address.
      withAddress.add(Number(existing.get(hash).person_id));
      continue;
    }
    if (ids.length > 1) {
      conflicts.push({ ...(entry.address ? { email: entry.address } : { email_hash_v1: hash }), person_ids: ids.sort((a, b) => a - b) });
      continue;
    }
    withAddress.add(ids[0]);
    toWrite.push({ hash, personId: ids[0] });
    if (holderHashes.has(hash)) fromHolders += 1;
  }
  const noAddress = holders.filter((id) => !withAddress.has(id) && ![...byHash.values()].some((e) => e.personIds.has(id)));

  const pending = !tablePresent || toWrite.length > 0;
  const plan = [];
  if (!tablePresent) plan.push(`create ${PERSON_LOGIN_TABLE}`);
  if (fromHolders) plan.push(`copy ${fromHolders} address${fromHolders === 1 ? '' : 'es'} of role holders into ${PERSON_LOGIN_TABLE}`);
  const others = toWrite.length - fromHolders;
  if (others) plan.push(`copy ${others} ${allAddresses ? 'other address' : 'address sign-in wrote'}${others === 1 ? '' : 'es'} into ${PERSON_LOGIN_TABLE}`);
  if (conflicts.length) plan.push(`skip ${conflicts.length} address${conflicts.length === 1 ? '' : 'es'} on more than one record (conflicts)`);
  const result = {
    pending,
    plan,
    role_holders: holders.length,
    addresses: toWrite.length,
    all_addresses: allAddresses,
    ...(askedAll && tablePresent ? { all_addresses_refused: 'every address is copied only by the run that creates person_login' } : {}),
    conflict_count: conflicts.length,
    conflicts: conflicts.slice(0, CONFLICTS_SHOWN),
    no_address: noAddress
  };
  if (dryRun) return { ...result, dry_run: true };
  if (!pending) return { ...result, changed: false };

  if (!tablePresent) await worker.install({ path: LOGIN_PATH, unique: true, trigger: 'upgrade' });
  const { written, taken } = await insertBackfillRows(worker, toWrite);
  const moved = tablePresent ? 0 : await moveLoginsMadeDuringRun(worker, taken);
  return { ...result, changed: true, written, ...(moved ? { moved } : {}) };
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
    sql: 'select count(*) as n from plugin where path in (?, ?)',
    values: [ROLES_PLUGIN_PATH, LOGIN_PATH]
  });
  return Number(data[0]?.n || 0) > 0;
}

export const upgrades = [
  {
    id: 'person_login',
    since: '1.15.0',
    description:
      'Turn sign-in on: create person_login (who can sign in, as which person) and copy the addresses of role holders, and those sign-in wrote, into it, so people keep signing in as the same person.',
    options: {
      sign_in: 'The site signs people in (POST /admin/upgrade passes it when the site has sign-in).',
      role_segments: 'Segment ids whose members are role holders, besides the roles plugin\'s segments (comma separated).',
      backfill_logins: 'Run the copy again, for role holders with no login (a table created without this upgrade).',
      all_addresses: 'Copy every address on file, not only role holders\' and those sign-in wrote. Only on the run that creates person_login; later joins are never logins.',
      sign_in_inputs: 'The input names sign-in wrote under (comma separated; default delegate).'
    },
    shouldUpgrade: async ({ sqlWorker, snapshot, options }) => {
      if (!snapshot.hasTable('person')) return false;
      if (snapshot.hasTable(PERSON_LOGIN_TABLE)) return truthyOption(options, 'backfill_logins', 'backfillLogins');
      return signsPeopleIn(sqlWorker, options);
    },
    run: backfillPersonLogin
  }
];
