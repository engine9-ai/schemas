# @engine9/schemas

The engine9 standard schemas: shared tables, inbound transforms, searches, and segments used by core and by plugins. Each directory with an `index.js` is a **schema plugin** (`@engine9/schemas/person_email`, `@engine9/schemas/transaction/core`, …). A schema plugin's table definitions are its `schema.js`. Building on these schema plugins lets other plugins share common tools and features while adding their own functionality.

This package is [MIT licensed](./LICENSE). Use, copy, modify, and distribute
this code as-is.

## Required plugins and editions

Every engine9 database has the **required plugins**, whatever else it installs: `plugin`, `person`, `segment`, and `source_code`. `@engine9/core` keeps that list (`REQUIRED_PLUGINS`) and installs them at setup. Everything else here is the site's choice, installed after setup with `npx e9core install --plugin <path>`.

An **edition** installs a set at once. It is a plugin with no tables whose `plugin.json` `include` list names what a kind of site adds to the required plugins. `e9core upgrade` reinstalls an installed edition, so a plugin an edition gains in a release reaches every database that has it.

| Edition | Adds | For |
| --- | --- | --- |
| [`editions/contact`](editions/contact/plugin.json) | `person_name`, `person_remote`, `person_email`, `person_phone`, `person_address`, `timeline`, `transaction/core`, `transaction/contact_details`, `login` | **Every new site.** Signup, login, and adding admins by email expect it. The setup wizard recommends it |
| [`editions/pii-free`](editions/pii-free/plugin.json) | `person_remote`, `person_hash`, `timeline`, `transaction/core` | Advanced. Sites that must not hold contact details and have checked what that costs: no names or email addresses, so no email to people and no admins added by email |

### Sign-in needs `login`

A site where people sign in needs [`login`](login/index.js) (`@engine9/schemas/login`, the `person_login` table: who can sign in, and as which person). It is not required: a data-only database never signs anyone in and leaves it out. The contact edition includes it. A database without it has no sign-in: `@engine9/core` refuses every sign-in rather than guess who someone is from addresses typed into forms. It holds hashes only, so a PII-free site can add it. To turn sign-in on for an existing database, and copy today's role holders into it:

```bash
npx e9core upgrade --plugin @engine9/schemas/login
```

An edition lists only additions; it never lists a required plugin. `exclude_pii` on [`utilities/limited-pii`](utilities/limited-pii/settings.js) is what makes an account PII-free: core refuses the plaintext contact plugins, and any plugin that includes one, such as `editions/contact`. The setting does not install an edition. A PII-free account need not keep hashes.

## Documentation

Each schema plugin is documented in its own `README.md`. That file is the human-readable contract: what the schema plugin is for, the data model, inbound/outbound behavior, segment definition clauses, **predefined segments**, and UI. Keep implementation details in code comments; keep audience and membership rules in the README. Dashboards live on `@engine9/plugins/reports/<area>`, not in this package.

Schema plugins with predefined segments:

- [`person_email`](person_email/README.md) — Email Subscribers
- [`person_phone`](person_phone/README.md) — Textable People
- [`transaction/core`](transaction/core/README.md) — Customers
- [`channels/email`](channels/email/README.md) — rolling-window email openers and clickers

See [`skills/create-engine9-plugin/SKILL.md`](../skills/create-engine9-plugin/SKILL.md) for the README layout.

## Conventions

- **Plugin uniqueness:** `SchemaWorker.install` reuses an existing `plugin` row when the path is unique: `metadata.unique` if set, otherwise `@engine9/schemas/*` (except `person_custom`, which is `unique: false`). Native plugins that set `unique: true` behave the same. Third-party plugins and `person_custom` may have more than one instance per path; pass `id` to update an existing non-unique row.

- **Public module surface:** Export only the standard building blocks documented in [`skills/create-engine9-plugin/SKILL.md`](../skills/create-engine9-plugin/SKILL.md): for example `metadata`, optional `schema`, `transforms`, `segmentDefinitionClauses`, `segments`, `metrics`, and the default object that aggregates them. Do **not** export `reports` from schema plugins — dashboards belong on `@engine9/plugins/reports/<area>`. Do **not** export ad hoc hooks (such as custom install helpers or segment–plugin wiring) from schema plugins; the server is responsible for any special install-time behavior tied to a specific schema plugin path.

- **Segments, universes, and `plugin_id`:** Saved segments use `segment.plugin_id` = the schema plugin (or plugin) that **owns the definition**. A definition’s **`universe`** describes the span of source data searched across; input EQL entries select timeline stores, while person/table entries can restrict eligible people. Explicit `pluginId` values inside a clause's options may narrow that span further, so a segment can evaluate data tied to other deployed plugins without changing its owning `plugin_id`. Export bundles use the same universe vocabulary for table and input-file artifacts.

## License

[MIT](./LICENSE). Use, copy, modify, and distribute this code as-is.
