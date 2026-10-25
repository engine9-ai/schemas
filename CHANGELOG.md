# Release notes: @engine9/schemas

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
