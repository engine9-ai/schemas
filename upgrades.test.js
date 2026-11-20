/*
  Every plugin's `upgrades` follow @engine9/core's contract
  (core docs/plugin-upgrades.md), and none is older than the package's
  upgrade window: an upgrade with `since` at or below UPGRADE_FROM is never
  needed by a supported database, so it is deleted instead.
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { UPGRADE_FROM } from './plugin/upgrades.js';

const root = path.dirname(fileURLToPath(import.meta.url));

function pluginDirs(dir = root, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (existsSync(path.join(full, 'index.js'))) out.push(full);
    pluginDirs(full, out);
  }
  return out;
}

const parse = (v) => v.split('.').map(Number);
const after = (a, b) => {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

test('plugin upgrades are well formed and inside the upgrade window', async () => {
  let count = 0;
  for (const dir of pluginDirs()) {
    const plugin = (await import(pathToFileURL(path.join(dir, 'index.js')).href)).default || {};
    const name = path.relative(root, dir);
    if (!plugin.upgrades) continue;
    assert.equal(plugin.upgradeFrom, UPGRADE_FROM, `${name}: upgradeFrom is the package's UPGRADE_FROM`);
    const ids = new Set();
    for (const u of plugin.upgrades) {
      count += 1;
      assert.ok(u.id && !ids.has(u.id), `${name}: unique id ${u.id}`);
      ids.add(u.id);
      assert.equal(typeof u.shouldUpgrade, 'function', `${name}/${u.id}: shouldUpgrade`);
      assert.equal(typeof u.run, 'function', `${name}/${u.id}: run`);
      assert.match(u.since, /^\d+\.\d+\.\d+$/, `${name}/${u.id}: since`);
      assert.ok(after(u.since, UPGRADE_FROM), `${name}/${u.id}: since ${u.since} is not above UPGRADE_FROM ${UPGRADE_FROM}; delete the upgrade`);
      assert.ok(u.description, `${name}/${u.id}: description`);
    }
  }
  assert.ok(count >= 4);
});

test('shouldUpgrade answers from the schema snapshot alone', async () => {
  const { upgrades: person } = await import('./person/upgrades.js');
  const { upgrades: login } = await import('./login/upgrades.js');
  const { upgrades: core } = await import('./plugin/upgrades.js');
  const snapshot = (tables) => ({
    hasTable: (t) => t in tables,
    describe: async ({ table }) => ({ columns: tables[table].map(([name, type, length]) => ({ name, type, length })) })
  });
  const legacy = snapshot({ person: [['id', 'id'], ['given_name', 'string', 255]], setting: [['value', 'string', 255]], plugin_history: [] });
  const current = snapshot({ person: [['id', 'id']], person_login: [['type', 'enum']], setting: [['value', 'text']] });
  // The plugin rows a database has (shouldUpgrade may read them, never people tables).
  const pluginRows = (paths) => ({
    query: async ({ values }) => ({ data: [{ n: values.filter((p) => paths.includes(p)).length }] })
  });
  const should = (u, s, account = {}, options = {}, sqlWorker = pluginRows([])) =>
    u.shouldUpgrade({ snapshot: s, account, options, sqlWorker });
  const [personName, nameColumns] = person;
  const [personLogin] = login;

  // Sign-in is its own plugin: the upgrade turns it on only where people sign in.
  assert.equal(await should(personLogin, legacy), false, 'a data-only database: no sign-in, no table');
  assert.equal(await should(personLogin, legacy, {}, {}, pluginRows(['roles'])), true, 'someone holds a role');
  assert.equal(await should(personLogin, legacy, {}, {}, pluginRows(['@engine9/schemas/editions/contact'])), false, 'an edition alone does not turn sign-in on');
  assert.equal(await should(personLogin, legacy, {}, { sign_in: true }), true, 'the site has sign-in');
  assert.equal(await should(personLogin, legacy, {}, { plugins: ['@engine9/schemas/login'] }), true, 'named in the run');
  assert.equal(await should(personLogin, legacy, {}, { role_segments: 'admins' }), true, 'role segments given');
  assert.equal(await should(personLogin, snapshot({}), {}, { sign_in: true }), false, 'an empty database: the install creates it');
  assert.equal(await should(personLogin, current, {}, { sign_in: true }), false, 'the table exists');
  assert.equal(await should(personLogin, current, {}, { backfill_logins: true }), true, 'backfill_logins runs it again');
  assert.equal(await should(personLogin, current, {}, { all_addresses: true }), false, 'all_addresses only on the run that creates the table');
  const [settingValue, pluginHistory] = core;

  assert.equal(await should(personName, legacy), true);
  assert.equal(await should(personName, legacy, { excludePii: true }), false, 'a PII-free account keeps no names');
  assert.equal(await should(nameColumns, legacy, { excludePii: true }), true);
  assert.equal(await should(settingValue, legacy), true);
  assert.equal(await should(pluginHistory, legacy), true);
  for (const u of [...person, ...core]) assert.equal(await should(u, current), false, `${u.id} on a current schema`);
});
