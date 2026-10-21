import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceCode, segmentDefinitionClauses } from './segmentDefinitionClauses.js';

test('timeline sourceCode is the only segment definition clause', () => {
  assert.deepEqual(Object.keys(segmentDefinitionClauses), ['sourceCode']);
});

test('timeline sourceCode requires sourceCode', () => {
  assert.throws(() => sourceCode.optionsToEQL({}), /sourceCode/);
});

test('timeline sourceCode exact match joins the dictionary', () => {
  const { text, eql } = sourceCode.optionsToEQL({ sourceCode: 'AU_TEST' });
  assert.equal(text, 'Has a timeline entry with source code AU_TEST');
  assert.equal(eql.table, 'timeline');
  assert.deepEqual(eql.columns, ['person_id']);
  assert.deepEqual(eql.joins, [
    {
      table: 'source_code_dictionary',
      join_eql: 'timeline.source_code_id=source_code_dictionary.source_code_id'
    }
  ]);
  assert.deepEqual(eql.conditions, [
    {
      type: 'EQUALS',
      values: [{ ref: { column: 'source_code' } }, { value: { value: 'AU_TEST' } }]
    }
  ]);
});

test('timeline sourceCode uses LIKE when the value contains %', () => {
  const { text, eql } = sourceCode.optionsToEQL({ sourceCode: 'AUTH_%' });
  assert.equal(text, 'Has a timeline entry with source code matching AUTH_%');
  assert.equal(eql.conditions[0].type, 'LIKE');
  assert.equal(eql.conditions[0].values[1].value.value, 'AUTH_%');
});
