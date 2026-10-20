import assert from 'node:assert/strict';
import test from 'node:test';
import { addresses } from './segmentDefinitionClauses.js';

const valuesByColumn = (eql) =>
  Object.fromEntries(eql.conditions.map((c) => [c.values[0].ref.column, [c.type, c.values[1].value.value]]));

test('region names normalize to the stored code', () => {
  const { text, eql } = addresses.optionsToEQL({ region: 'Virginia' });
  assert.equal(eql.table, 'person_address');
  assert.deepEqual(eql.columns, ['person_id']);
  assert.deepEqual(valuesByColumn(eql), { region: ['EQUALS', 'VA'] });
  assert.equal(text, 'Has an address in VA');
});

test('Canadian province names normalize without a country', () => {
  const { eql } = addresses.optionsToEQL({ region: 'Ontario' });
  assert.deepEqual(valuesByColumn(eql), { region: ['EQUALS', 'ON'] });
});

test('postal codes normalize by shape, or match a LIKE pattern', () => {
  assert.deepEqual(valuesByColumn(addresses.optionsToEQL({ postalCode: '22201-1234' }).eql), {
    postal_code: ['EQUALS', '22201']
  });
  assert.deepEqual(valuesByColumn(addresses.optionsToEQL({ postalCode: 'k1a0b1' }).eql), {
    postal_code: ['EQUALS', 'K1A 0B1']
  });
  assert.deepEqual(valuesByColumn(addresses.optionsToEQL({ postalCode: 'SW1A 1AA' }).eql), {
    postal_code: ['EQUALS', 'SW1A 1AA']
  });
  assert.deepEqual(valuesByColumn(addresses.optionsToEQL({ postalCode: '220%' }).eql), {
    postal_code: ['LIKE', '220%']
  });
});

test('country narrows the match and drives region normalization', () => {
  const { text, eql } = addresses.optionsToEQL({ region: 'virginia', country: 'United States' });
  assert.deepEqual(valuesByColumn(eql), { region: ['EQUALS', 'VA'], country: ['EQUALS', 'US'] });
  assert.equal(text, 'Has an address in VA in country US');
});

test('no options means any address', () => {
  const { text, eql } = addresses.optionsToEQL({});
  assert.deepEqual(eql.conditions, []);
  assert.equal(text, 'Has an address');
});
