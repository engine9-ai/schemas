# Person Name Schema Plugin

`@engine9/schemas/person_name` stores a person's plaintext name: `given_name` and `family_name`, one row per person.

Names are personal data, so they are not on `person`. `person` holds only the id and timestamps, and every account installs it. An account that must not store names leaves this plugin out, the same way it leaves out `person_email`, `person_phone`, and `person_address`.

- The standard stack (`@engine9/schemas/stacks/standard`) and the no-argument `installDefaultPlugins()` install it.
- The limited-pii stack (`@engine9/schemas/stacks/limited-pii`) excludes it. With `exclude_pii` set on `@engine9/schemas/utilities/limited-pii`, core refuses to install it.

## Install

```javascript
await pluginWorker.install({ path: '@engine9/schemas/person_name' });
```

A second install of the same path reuses the existing plugin row.

## Inbound pipeline slots

```javascript
inbound: {
  upsert: ['upsertPersonName']
}
```

When the plugin is installed, core weaves `upsertPersonName` into the `upsert` slot of the inbound people pipeline. When it is not installed, the step is not in the chain. Incoming `given_name` / `family_name` fields are then ignored and nothing is stored. How slots and the weaver work: `@engine9/core/lib/peoplePipeline/README.md`.

## Data Model

### `person_name`

Primary key: `person_id`.

| Field | Type | Description |
| --- | --- | --- |
| `person_id` | `person_id` | Person the name belongs to. |
| `given_name` | `string` | Given (first) name. |
| `family_name` | `string` | Family (last) name. |
| `source_input_id` | `foreign_uuid` | Input that first wrote the row. Existing rows keep their original source. Rows copied by the core `person_name` upgrade have none. |
| `created_at` / `modified_at` | timestamps | |

## Inbound Behavior

`upsertPersonName` runs for each row that has a `given_name` or `family_name` key:

- A key that is present overwrites the stored value. An explicit `null` clears it.
- A key that is absent keeps the stored value.
- Rows for the same person in one batch merge; later keys win.
- A row with a name and no `person_id` fails the batch.

## Outbound Behavior

`appendName` adds `given_name` and `family_name` to each row by `person_id`. People with no row get `null` for both.

`@engine9/schemas/person:transforms:appendName` is the same transform, kept so saved export definitions keep working.

## Segment definition clauses

`names` matches people by `given_name` and/or `family_name` with `LIKE`. With neither, it selects everyone who has a name row.

## Upgrading accounts created before this plugin

Before this plugin, the names were `person.given_name` and `person.family_name`. Run the core upgrade once per account after installing this version of `@engine9/schemas`:

- `PluginWorker.upgrade()` (server: `e9 personworker upgrade -a <account_id>`)
- `npx e9core upgrade --db <connection>` for a SQLite or MySQL database
- `npx e9core upgrade --url https://<site>` for a Cloudflare site (it posts to `/api/admin/upgrade` with `E9_ADMIN_API_KEY`)

The upgrade installs this plugin and copies every non-blank name into `person_name`. It then refreshes the `person` plugin's inbound snapshot, so later loads write `person_name` only. The columns stay on `person` with the names as of the upgrade. Dropping them is a separate, opt-in step (`drop_name_columns`), for when nothing reads them. On a PII-free account the upgrade does not install this plugin, and the opt-in drop removes the columns only when they are empty, or when you also pass `discard_names`.
