# Release notes: @engine9/schemas

## 1.15.0: `login`, the sign-in list

Pair with `@engine9/core` 1.22.0, which reads it for every sign-in. Plain
steps for site owners: core `docs/upgrade-1.22.md`.

| # | Change | Who is affected | Breaks a build? |
| --- | --- | --- | --- |
| 1 | **New plugin `@engine9/schemas/login`** with one table, `person_login`: who can sign in, and as which person. One row per login (`type` `email` or `delegate`, `value_hash`, `subject`, `person_id`, `how`, `state`, `last_sign_in_at`). Hashes and Delegate pseudonyms only, so a PII-free account can install it. The people pipeline never writes it. It is not required: a database without it has no sign-in | Sites where people sign in | No |
| 2 | **The contact edition includes `login`.** `e9core upgrade` reinstalls the edition, so every contact-edition database gets it. The PII-free edition does not include it | Contact-edition sites | No |
| 3 | **New upgrade: `person_login`** on `login`. On a database that signs people in (the site has sign-in, someone holds a role, the contact edition is installed, or the run names the plugin), it creates the table and copies every role holder's addresses into it (`person_email`, `person_hash_email`), active, so admins keep signing in as before. Role holders are members of the `roles` plugin's segments plus `role_segments` (core's `POST /admin/upgrade` passes the site's configured roles and `sign_in`). An address two role holders share is reported (`conflicts`), as are role holders with no address (`no_address`). A data-only database is left alone. `backfill_logins` runs the copy again | Every database where people sign in | No |

### What a site changes

| Where | Find | Change to |
| --- | --- | --- |
| `package.json` | `@engine9/schemas` 1.14.x | `^1.15.0`, with `@engine9/core` `^1.22.0` |
| An existing database | (no `person_login` table) | `npx e9core upgrade --url <site>` after the deploy |
| A site with sign-in that is not on the contact edition, upgraded with `--db` | (no `person_login` table after the upgrade) | `npx e9core upgrade --plugin @engine9/schemas/login --db …` |
| A data-only database | | Nothing |

## 1.14.0: stacks become editions; `default_stack` is retired

Pair with `@engine9/core` 1.21.0, which installs only the required plugins
(`plugin`, `person`, `segment`, `source_code`) by default and names no
install list of its own.

| # | Change | Who is affected | Breaks a build? |
| --- | --- | --- | --- |
| 1 | **`stacks/standard` is now `editions/contact`**, and `stacks/limited-pii` is now `editions/pii-free`. An edition lists only what it adds to the required plugins, so neither lists `plugin`, `person`, `segment`, or `source_code` any more | Code and config that name the stack paths | Yes |
| 2 | The include list is in `plugin.json` (was `stack.json`); `@engine9/core` 1.21.0's `build-plugins` reads it | Plugin packages that copied the stack layout | Yes, for a package with `stack.json` |
| 3 | **Removed: the `default_stack` setting** on `@engine9/schemas/plugin`. Nothing reads it | Accounts that set it | No: the upgrade below retires it |
| 4 | **New upgrade: `retire_stacks`** on `@engine9/schemas/plugin`. It renames a `stacks/` plugin row to its edition (or deletes it when the edition already has a row), installs the edition a `default_stack` named when the account never installed it (unless `exclude_pii` refuses it), reports any other `default_stack` value as `dropped_default`, and deletes the setting | Every database with a `stacks/` row or a `default_stack` setting | No |
| 5 | `exclude_pii` (`utilities/limited-pii`) describes what core 1.21.0 does: it refuses plaintext contact plugins and any plugin that includes one, and installs nothing | PII-free accounts | No |

### What a site changes

| Where | Find | Change to |
| --- | --- | --- |
| `package.json` | `@engine9/schemas` 1.13.x | `^1.14.0`, with `@engine9/core` `^1.21.0` |
| An existing database | A `stacks/` plugin row, a `default_stack` setting | `npx e9core upgrade --url <site>` after the deploy |
| Code, config, docs | `@engine9/schemas/stacks/standard` | `@engine9/schemas/editions/contact` |
| Code, config, docs | `@engine9/schemas/stacks/limited-pii` | `@engine9/schemas/editions/pii-free` |
| Code that installs an edition on an empty database | `install({ path: '…/stacks/standard' })` | `installRequiredPlugins()`, then `install({ path: '@engine9/schemas/editions/contact' })` |

## 1.13.0: the upgrades move here from `@engine9/core`

`@engine9/core` 1.17.0 carries no upgrades. Each plugin declares its own,
and `e9core upgrade` runs them (core `docs/plugin-upgrades.md`). The four
upgrades core carried are now here, with the same ids, options, and results:

| Upgrade | Plugin | File |
| --- | --- | --- |
| `person_name`: copy `person.given_name` / `family_name` into `person_name` | `@engine9/schemas/person` | `person/upgrades.js` |
| `person_name_columns` (opt-in `drop_name_columns`, with `discard_names`) | `@engine9/schemas/person` | `person/upgrades.js` |
| `setting_value_text`: widen `setting.value` to text | `@engine9/schemas/plugin` | `plugin/upgrades.js` |
| `plugin_history` (opt-in `drop_plugin_history`): drop the retired table when empty | `@engine9/schemas/plugin` | `plugin/upgrades.js` |

Each has a `shouldUpgrade` that answers from the schema alone, so
`e9core status` reads data only for an upgrade that applies. The package's
upgrade window is `UPGRADE_FROM` (1.9.0) in `plugin/upgrades.js`; both
plugins export it as `upgradeFrom`.

### What a site changes

| Where | Find | Change to |
| --- | --- | --- |
| `package.json` | `@engine9/schemas` 1.12.x with `@engine9/core` 1.17.0 | `^1.13.0`. Core 1.17.0 finds no upgrades in 1.12.x |
| Code that reads `PluginWorker.upgrade` results by position | `upgrades[0]` | `upgrades.find((u) => u.id === 'person_name')`. Upgrades are listed by plugin, `@engine9/schemas/plugin` first |

Pair with `@engine9/core` 1.17.0+.

## 1.12.0: `plugin_history` is retired; `plugin` records the last install

`@engine9/schemas/plugin` no longer declares the `plugin_history` table.
Nothing wrote to it. The history of plugin installs is now the audit log in
`@engine9/core` 1.17.0 (`plugin.install` records, with the schema changes
each install applied).

A new database does not create the table. An existing database keeps it:
dropping a table from a schema never drops it from a database. `@engine9/core`
1.17.0 has an opt-in upgrade that drops it when it is empty. The name stays
reserved and is never reused.

The `plugin` table gains three columns that `@engine9/core` 1.17.0 writes on
every install: `last_install_at`, `last_install_status` (`ok` or
`failed`), and `last_install` (JSON: the step it stopped at, the error, what
ran it, package versions). The additive change deploys with
`npx e9core upgrade`.

### What a site changes

| Where | Find | Change to |
| --- | --- | --- |
| Queries or reports | `plugin_history` | The audit log's `plugin.install` records |
| An existing database | The `plugin_history` table | Nothing, or drop it: `npx e9core upgrade --url <site> --drop-plugin-history` (refuses while it has rows) |
| SQL files that create the standard tables | `create table … "plugin_history"` | Remove it |
| SQL files that create the standard tables | `create table … "plugin"` | Add `last_install_at`, `last_install_status`, `last_install` |
| An existing database | The `plugin` table | `npx e9core upgrade --url <site>` adds the columns |
| `package.json` | `@engine9/input-tools` below `^2.7.0` | Nothing: npm installs `^2.7.0` (MIT) with this release. It holds the one copy of the value and id helpers core also uses |

Pair with `@engine9/core` 1.17.0+.

## 1.11.5: limited-pii stack is an install list only

`@engine9/schemas/stacks/limited-pii` no longer declares `metadata.exclude`.
Install refusal for plaintext plugins is
`exclude_pii` on `@engine9/schemas/utilities/limited-pii` (in `@engine9/core`).

### What a site changes

| Where | Find | Change to |
| --- | --- | --- |
| Accounts with the limited-pii stack but not the setting | Relying on stack `exclude` to block installs | Install the utility and set `exclude_pii` to `true` |
| Docs that describe stack `exclude` as the PII-free guard | Stack exclude list | The setting; the stack lists plugins to install |

Pair with `@engine9/core` 1.15.3+.
