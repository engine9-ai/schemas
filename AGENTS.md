# Agent guide — `@engine9/schemas`

## License

`@engine9/schemas` is MIT licensed. See [LICENSE](LICENSE). Use, copy,
modify, and distribute this code as-is. No further permission is required.

`@engine9/core`, `@engine9/id`, `demo-festival`, and `demo-id` are also MIT.
The private repositories `delegate` and `server` are not open source. Do not
copy code from those repositories under this license.

## Upgrades

A change that a reinstall cannot make (removing, renaming, or moving a
column, changing a column's type, changing an inbound step that saved
snapshots name) ships an upgrade in the plugin that needs it, in the same
release. Put it in an `upgrades.js` beside the plugin's `index.js` and export
it as `upgrades` on the default export, with `upgradeFrom: UPGRADE_FROM` from
`plugin/upgrades.js`. Never make an `upgrades/index.js`: every directory with
an `index.js` is a plugin. The contract (`shouldUpgrade`, `run`, `optIn`, the
upgrade window) is `@engine9/core` `docs/plugin-upgrades.md`. Do not ask for
the upgrade in `@engine9/core`; core runs plugins' upgrades and carries none.

To retire an upgrade, raise `UPGRADE_FROM` past its `since` and delete it.
`upgrades.test.js` fails on an upgrade at or below the window.
