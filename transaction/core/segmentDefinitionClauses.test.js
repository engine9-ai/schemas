import assert from 'node:assert/strict';
import test from 'node:test';
import { all, segmentDefinitionClauses } from './segmentDefinitionClauses.js';

test('all is the only transaction clause', () => {
  assert.deepEqual(Object.keys(segmentDefinitionClauses), ['all']);
});

test('amount bounds apply to the same transaction as the date window', () => {
  const { text, eql } = all.optionsToEQL({ start: '2026-01-01', minAmount: 100, maxAmount: '500' });
  assert.deepEqual(eql.conditions, [
    "transaction.ts>='2026-01-01T00:00:00.000Z'",
    'transaction.amount>=100',
    'transaction.amount<=500'
  ]);
  assert.equal(text, 'Has any transactions with ts >= 2026-01-01T00:00:00.000Z with amount >= 100 with amount <= 500');
});

test('blank amounts are ignored and invalid amounts throw', () => {
  assert.deepEqual(all.optionsToEQL({ minAmount: '', maxAmount: null }).eql.conditions, []);
  assert.throws(() => all.optionsToEQL({ minAmount: 'abc' }), /Invalid minAmount: abc/);
  assert.throws(() => all.optionsToEQL({ maxAmount: '1; drop table person' }), /Invalid maxAmount/);
});

test('sourceCode joins final_source_code_id and matches the dictionary', () => {
  const { text, eql } = all.optionsToEQL({ sourceCode: 'AU_TEST' });
  assert.equal(text, 'Has any transactions with source code AU_TEST');
  assert.deepEqual(eql.joins, [
    { table: 'input', join_eql: 'transaction.input_id=input.id' },
    {
      table: 'source_code_dictionary',
      join_eql: 'transaction.final_source_code_id=source_code_dictionary.source_code_id'
    }
  ]);
  assert.deepEqual(eql.conditions, [
    {
      type: 'EQUALS',
      values: [{ ref: { column: 'source_code' } }, { value: { value: 'AU_TEST' } }]
    }
  ]);
});

test('sourceCode uses LIKE when the value contains %', () => {
  const { text, eql } = all.optionsToEQL({ sourceCode: 'AUTH_%' });
  assert.equal(text, 'Has any transactions with source code matching AUTH_%');
  assert.equal(eql.conditions[0].type, 'LIKE');
  assert.equal(eql.conditions[0].values[1].value.value, 'AUTH_%');
});

test('blank sourceCode does not join the dictionary', () => {
  const { eql } = all.optionsToEQL({ sourceCode: '  ' });
  assert.deepEqual(eql.joins, [{ table: 'input', join_eql: 'transaction.input_id=input.id' }]);
  assert.deepEqual(eql.conditions, []);
});
