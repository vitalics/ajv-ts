---
"ajv-ts": minor
---

Finish the `$async` feature: async schemas now validate for real.

- `safeParse`, `parse` and `validate` on a schema marked with `.async()` now return a `Promise` — both at runtime and at the type level. Previously the compiled Ajv validate function was called synchronously, so async schemas silently reported success without real validation.
- `parse` on an async schema rejects with the validation error; `validate` resolves to a `boolean`.
- `preprocess`/`postprocess`/`refine` functions are applied on the async path as well.
- `~standard` (Standard Schema) `validate` now returns a `Promise` for `$async` schemas, as the spec allows.
- `async()`/`sync()` now record `$async: true`/`$async: false` in the schema type; the new exported `IsSchemaAsync<Schema>` helper drives the promise-aware return types.
- `fromJSON` is generic over the passed schema, so merged literal properties (e.g. `title`) are preserved in the resulting schema type.

**Migration note:** if you used `.async()` before, wrap parse results with `await` (or switch to `safeParse` and await it) — results are now `Promise`s.
