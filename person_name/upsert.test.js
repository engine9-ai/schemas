import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import upsertPersonName from './transforms/inbound/upsert_tables.js';
import appendName from './transforms/outbound/appendName.js';
import plugin from './index.js';

describe('person_name upsert_tables', () => {
  it('is declared in the inbound upsert slot', () => {
    assert.deepEqual(plugin.metadata.inbound, { upsert: ['upsertPersonName'] });
    assert.equal(plugin.transforms.upsertPersonName.type, 'upsert');
  });

  it('queues one person_name row with every column', async () => {
    const tablesToUpsert = {};
    await upsertPersonName.transform({
      batch: [{ person_id: 1, input_id: 'input-a', email: 'ada@example.com', given_name: 'Ada' }],
      databaseNames: [],
      tablesToUpsert
    });
    assert.deepEqual(tablesToUpsert.person_name, [
      { person_id: 1, source_input_id: 'input-a', given_name: 'Ada', family_name: null }
    ]);
    assert.equal('person' in tablesToUpsert, false, 'never writes the person table');
  });

  it('keeps the stored value for a name key the row did not send', async () => {
    const tablesToUpsert = {};
    await upsertPersonName.transform({
      batch: [{ person_id: 2, input_id: 'input-b', family_name: 'Lovelace' }],
      databaseNames: [{ person_id: '2', given_name: 'Ada', family_name: 'Byron', source_input_id: 'input-a' }],
      tablesToUpsert
    });
    assert.deepEqual(tablesToUpsert.person_name, [
      { person_id: 2, source_input_id: 'input-a', given_name: 'Ada', family_name: 'Lovelace' }
    ]);
  });

  it('clears a name when the key is present and null', async () => {
    const tablesToUpsert = {};
    await upsertPersonName.transform({
      batch: [{ person_id: 3, family_name: null }],
      databaseNames: [{ person_id: 3, given_name: 'Ada', family_name: 'Lovelace', source_input_id: null }],
      tablesToUpsert
    });
    assert.equal(tablesToUpsert.person_name[0].given_name, 'Ada');
    assert.equal(tablesToUpsert.person_name[0].family_name, null);
  });

  it('merges rows for the same person in one batch, later keys winning', async () => {
    const tablesToUpsert = {};
    await upsertPersonName.transform({
      batch: [
        { person_id: 4, input_id: 'first', given_name: 'Ada', family_name: 'Byron' },
        { person_id: '4', input_id: 'second', family_name: 'Lovelace' }
      ],
      databaseNames: [],
      tablesToUpsert
    });
    assert.deepEqual(tablesToUpsert.person_name, [
      { person_id: 4, source_input_id: 'first', given_name: 'Ada', family_name: 'Lovelace' }
    ]);
  });

  it('queues nothing when no row has a name key', async () => {
    const tablesToUpsert = {};
    await upsertPersonName.transform({
      batch: [{ person_id: 5, email: 'ada@example.com' }, { email: 'no-id@example.com' }],
      databaseNames: [],
      tablesToUpsert
    });
    assert.deepEqual(tablesToUpsert, {});
  });

  it('throws when a name is present and person_id is missing', async () => {
    await assert.rejects(
      () => upsertPersonName.transform({ batch: [{ given_name: 'Ada' }], databaseNames: [], tablesToUpsert: {} }),
      /no person_id/
    );
  });
});

describe('person_name appendName', () => {
  it('appends names by person_id', () => {
    const batch = [{ person_id: 1 }, { person_id: 2 }];
    appendName.transform({ batch, names: [{ person_id: 1, given_name: 'Ada', family_name: 'Lovelace' }] });
    assert.deepEqual(batch, [
      { person_id: 1, given_name: 'Ada', family_name: 'Lovelace' },
      { person_id: 2, given_name: null, family_name: null }
    ]);
  });
});
