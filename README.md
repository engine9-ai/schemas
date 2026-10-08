# @engine9/schemas

The engine9 standard schemas: shared tables, inbound transforms, searches, and segments used by core and by plugins. Each directory with an `index.js` is a **schema plugin** (`@engine9/schemas/person_email`, `@engine9/schemas/transaction/core`, …). A schema plugin's table definitions are its `schema.js`. Building on these schema plugins lets other plugins share common tools and features while adding their own functionality.

This package was published as `@engine9/interfaces` through 1.8.1. `@engine9/core` 1.9 does not read `@engine9/interfaces/...` paths; run `PluginWorker.migratePackageRename` to rewrite rows stored before the rename.

This package is [MIT licensed](./LICENSE). Use, copy, modify, and distribute
this code as-is.

## Documentation

Each schema plugin is documented in its own `README.md`. That file is the human-readable contract: what the schema plugin is for, the data model, inbound/outbound behavior, search, **predefined segments**, and UI. Keep implementation details in code comments; keep audience and membership rules in the README. Dashboards live on `@engine9/plugins/reports/<area>`, not in this package.

Schema plugins with predefined segments:

- [`person_email`](person_email/README.md) — Email Subscribers
- [`person_phone`](person_phone/README.md) — Textable People
- [`transaction/core`](transaction/core/README.md) — Customers
- [`channels/email`](channels/email/README.md) — rolling-window email openers and clickers

See [`skills/create-engine9-plugin/SKILL.md`](../skills/create-engine9-plugin/SKILL.md) for the README layout.

## Conventions

- **Plugin uniqueness:** `SchemaWorker.install` reuses an existing `plugin` row when the path is unique: `metadata.unique` if set, otherwise `@engine9/schemas/*` (except `person_custom`, which is `unique: false`). Native plugins that set `unique: true` behave the same. Third-party plugins and `person_custom` may have more than one instance per path; pass `id` to update an existing non-unique row.

- **Public module surface:** Export only the standard building blocks documented in [`skills/create-engine9-plugin/SKILL.md`](../skills/create-engine9-plugin/SKILL.md): for example `metadata`, optional `schema`, `transforms`, `search`, `segments`, `metrics`, and the default object that aggregates them. Do **not** export `reports` from schema plugins — dashboards belong on `@engine9/plugins/reports/<area>`. Do **not** export ad hoc hooks (such as custom install helpers or segment–plugin wiring) from schema plugins; the server is responsible for any special install-time behavior tied to a specific schema plugin path.

- **Segments, universes, and `plugin_id`:** Saved segments use `segment.plugin_id` = the schema plugin (or plugin) that **owns the definition**. A definition’s **`universe`** describes the span of source data searched across; input EQL entries select timeline stores, while person/table entries can restrict eligible people. Explicit `pluginId` values inside `search` options may narrow that span further, so a segment can evaluate data tied to other deployed plugins without changing its owning `plugin_id`. Export bundles use the same universe vocabulary for table and input-file artifacts.

## License

[MIT](./LICENSE). Use, copy, modify, and distribute this code as-is.
