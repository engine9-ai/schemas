import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metadata as standard } from './standard/index.js';
import { metadata as limitedPii } from './limited-pii/index.js';

test('standard stack includes plaintext contact plugins and does not exclude them', () => {
  assert.equal(standard.name, '@engine9/schemas/stacks/standard');
  assert.ok(standard.include.includes('@engine9/schemas/person_name'));
  assert.ok(standard.include.includes('@engine9/schemas/transaction/contact_details'));
  assert.ok(standard.include.includes('@engine9/schemas/person_email'));
  assert.ok(standard.include.includes('@engine9/schemas/person_phone'));
  assert.ok(standard.include.includes('@engine9/schemas/person_address'));
  assert.ok(standard.include.includes('@engine9/schemas/timeline'));
  assert.ok(standard.include.includes('@engine9/schemas/source_code'));
  assert.ok(
    standard.include.indexOf('@engine9/schemas/source_code') <
      standard.include.indexOf('@engine9/schemas/timeline'),
    'source_code must install before timeline (timeline depends on it)'
  );
  assert.ok(standard.include.includes('@engine9/schemas/transaction/core'));
  assert.ok(!standard.include.includes('@engine9/plugins/reports/people'));
  assert.deepEqual(standard.exclude, []);
});

test('limited-pii stack includes person_hash and excludes plaintext contact plugins', () => {
  assert.equal(limitedPii.name, '@engine9/schemas/stacks/limited-pii');
  assert.ok(limitedPii.include.includes('@engine9/schemas/person_hash'));
  for (const path of ['@engine9/schemas/person_name', '@engine9/schemas/transaction/contact_details']) {
    assert.ok(!limitedPii.include.includes(path), `${path} is not included`);
    assert.ok(limitedPii.exclude.includes(path), `${path} is excluded`);
  }
  assert.ok(!limitedPii.include.includes('@engine9/schemas/person_email'));
  assert.ok(!limitedPii.include.includes('@engine9/schemas/person_phone'));
  assert.ok(!limitedPii.include.includes('@engine9/schemas/person_address'));
  assert.ok(limitedPii.exclude.includes('@engine9/schemas/person_email'));
  assert.ok(limitedPii.exclude.includes('@engine9/schemas/person_phone'));
  assert.ok(limitedPii.exclude.includes('@engine9/schemas/person_address'));
});
