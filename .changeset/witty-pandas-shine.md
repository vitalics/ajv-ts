---
"ajv-ts": patch
---

Tooling: finalize Biome migration and fix array type-level bugs.

- Migrated the whole codebase to the Biome formatter with 2-space indentation (`indentStyle: "space"`) and removed the leftover `.eslintrc.json`.
- Added the `lint:fix` script (`biome check --write .`).
- Fixed the build loop: `tsup.config.mts` now passes `config: false` so tsup no longer rebuilds its own config file when executed via `tsx`.
- Fixed `ArraySchemaBuilder.readonly()` type inference: tuple results with `prefixItems` now keep the readonly modifier instead of recursing through `MakeReadonly`.
- Fixed `ArraySchemaBuilder.minLength()` to preserve the `Output` generic in its return type.
- `readonly()` is now documented as also setting `unevaluatedItems: false` (JSON Schema draft 2020-12, section 11.2).
- `tsconfig.json`: dropped `downlevelIteration` and narrowed `include` to `src/*` + `tests`.
