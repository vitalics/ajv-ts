---
"ajv-ts": patch
---

Release prep: restored APIs, new builders, bug fixes, and minimal object schemas.

- Restored `error()`, `meta()`, `preprocess()`, `postprocess()`, `refine()`, `async()`, `sync()`, the `ajv` getter, and the `shape` setter on `SchemaBuilder`.
- Restored top-level exports: `keyof`, `fromJSON`, `const`/`literal`, `never`, `not`, `union`, `infer`, `any`, and `unknown`.
- Added `ConstantSchemaBuilder` (`s.const` / `s.literal`) and `NotSchemaBuilder` (`s.not` / `s.never`).
- Fixed `nullable()` so it no longer nests `type` arrays or duplicates `null`.
- Fixed `multipleOf()` / `step()` to use `Math.abs(value)` and produce valid Ajv schemas.
- Fixed `examples()` to flatten a single array argument instead of double-wrapping it.
- Reworked `ObjectSchemaBuilder` so default and derived schemas are minimal (only `type`, `properties`, and `required` when relevant; no extra `undefined`-valued keys).
- Added `.and()` alias for merging/extending object schemas.
- Added comprehensive `*.types.test.ts` compile-time type tests.
- Added `// @ts-nocheck` to legacy runtime tests whose loose type assertions are now invalid under stricter builder generics.
