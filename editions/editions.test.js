import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metadata as contact } from './contact/index.js';
import { metadata as piiFree } from './pii-free/index.js';

/* Every engine9 database has these (@engine9/core REQUIRED_PLUGINS); an edition adds to them. */
const REQUIRED = [
  '@engine9/schemas/plugin',
  '@engine9/schemas/person',
  '@engine9/schemas/segment',
  '@engine9/schemas/source_code'
];

const PLAINTEXT = [
  '@engine9/schemas/person_name',
  '@engine9/schemas/person_email',
  '@engine9/schemas/person_phone',
  '@engine9/schemas/person_address',
  '@engine9/schemas/transaction/contact_details'
];

test('editions list only what they add to the required plugins', () => {
  for (const edition of [contact, piiFree]) {
    for (const path of REQUIRED) assert.ok(!edition.include.includes(path), `${edition.name} does not list required ${path}`);
    assert.equal(edition.exclude, undefined, `${edition.name} refuses nothing; exclude_pii does`);
  }
});

test('the contact edition includes the plaintext contact plugins', () => {
  assert.equal(contact.name, '@engine9/schemas/editions/contact');
  for (const path of PLAINTEXT) assert.ok(contact.include.includes(path), `${path} is included`);
  assert.ok(contact.include.includes('@engine9/schemas/timeline'));
  assert.ok(contact.include.includes('@engine9/schemas/transaction/core'));
  assert.ok(
    contact.include.indexOf('@engine9/schemas/transaction/core') <
      contact.include.indexOf('@engine9/schemas/transaction/contact_details'),
    'transaction/core installs before contact_details'
  );
  assert.ok(!contact.include.includes('@engine9/plugins/reports/people'));
  assert.ok(!contact.include.includes('@engine9/schemas/login'), 'sign-in is added on purpose, not by an edition');
});

test('the pii-free edition includes person_hash and no plaintext contact plugin', () => {
  assert.equal(piiFree.name, '@engine9/schemas/editions/pii-free');
  assert.ok(piiFree.include.includes('@engine9/schemas/person_hash'));
  for (const path of PLAINTEXT) assert.ok(!piiFree.include.includes(path), `${path} is not included`);
  assert.ok(!piiFree.include.includes('@engine9/schemas/login'), 'sign-in is added by hand on a PII-free site');
});
