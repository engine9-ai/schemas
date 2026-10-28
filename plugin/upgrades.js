/*
  Upgrades for the core tables (plugin, setting). @engine9/core runs these
  from `e9core upgrade` and checks them from `e9core status` (core
  docs/plugin-upgrades.md). shouldUpgrade reads only the schema snapshot.

  setting_value_text (1.11.2): widen setting.value from varchar(255) to text.
  Plugin settings such as people_custom_fields are JSON strings that exceed
  255 characters; MySQL truncates them. A reinstall never changes a column's
  type, so this upgrade does (sqlWorker.changeColumnType).

  plugin_history (1.12.0, opt-in drop_plugin_history): drop the retired
  plugin_history table. Nothing wrote to it, and plugin install history is
  the audit log. It drops only an empty table: rows were written by something
  outside core, so they are not in the audit log, and the upgrade refuses
  until someone has kept and removed them.
*/

/*
  The upgrade window of @engine9/schemas: the oldest version a database can
  have last been installed from for these upgrades to bring it current. Raise
  it when an upgrade is deleted, to the version that upgrade's databases are
  past. Every upgrade here has a `since` above it.
*/
export const UPGRADE_FROM = '1.9.0';

const PLUGIN_HISTORY = 'plugin_history';

function isWideText(col) {
  if (!col) return false;
  const ct = String(col.column_type || '')
    .toLowerCase()
    .split('(')[0]
    .trim();
  if (col.type === 'text') return true;
  if (ct === 'text' || ct === 'mediumtext' || ct === 'longtext' || ct === 'clob') return true;
  if (Number(col.length) > 255) return true;
  return false;
}

async function settingValue(source) {
  const { columns } = await source.describe({ table: 'setting' });
  return columns.find((c) => c.name === 'value') || null;
}

function valueState(col) {
  return {
    value_type: col?.type || null,
    value_column_type: col?.column_type || null,
    value_length: col?.length ?? null
  };
}

export async function upgradeSettingValueText({ sqlWorker: worker, dryRun }) {
  const dialect = worker.dialect?.name || null;
  const before = await settingValue(worker);
  const pending = !isWideText(before);
  const plan = pending ? [dialect === 'SQLite' ? 'rebuild setting with value as text' : 'alter setting.value to text'] : [];
  const result = { pending, dialect, ...valueState(before), plan };
  if (dryRun) return { ...result, dry_run: true };
  if (!pending) return { ...result, changed: false };

  await worker.changeColumnType({ table: 'setting', column: 'value', type: 'text' });
  const after = await settingValue(worker);
  if (!isWideText(after)) {
    throw new Error(`setting.value is still ${after?.column_type || after?.type || 'unknown'} after widen`);
  }
  return { ...result, changed: true, ...valueState(after) };
}

export async function dropPluginHistory({ sqlWorker: worker, dryRun }) {
  const { data } = await worker.query(`select count(*) as n from ${PLUGIN_HISTORY}`);
  const rows = Number(data[0]?.n || 0);
  const blocked = rows
    ? `${PLUGIN_HISTORY} has ${rows} row${rows === 1 ? '' : 's'}. Nothing in core wrote them, so they are not in the audit log. Copy them somewhere you keep, delete them, then re-run.`
    : null;
  const result = { pending: true, rows, plan: [`drop table ${PLUGIN_HISTORY}`] };
  if (dryRun) return { ...result, dry_run: true, ...(blocked ? { blocked } : {}) };
  if (blocked) throw new Error(blocked);
  await worker.query(`drop table ${PLUGIN_HISTORY}`);
  return { ...result, changed: true, dropped: [PLUGIN_HISTORY] };
}

export const upgrades = [
  {
    id: 'setting_value_text',
    since: '1.11.2',
    description: 'Widen setting.value from varchar(255) to text so JSON plugin settings are not truncated.',
    shouldUpgrade: async ({ snapshot }) => snapshot.hasTable('setting') && !isWideText(await settingValue(snapshot)),
    run: upgradeSettingValueText
  },
  {
    id: 'plugin_history',
    since: '1.12.0',
    optIn: 'drop_plugin_history',
    description: 'Drop the retired plugin_history table when it is empty (opt-in: drop_plugin_history).',
    shouldUpgrade: ({ snapshot }) => snapshot.hasTable(PLUGIN_HISTORY),
    run: dropPluginHistory
  }
];
