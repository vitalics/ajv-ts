---
"ajv-ts": minor
---

Finish the `$async` feature: async schemas now validate for real.

- `safeParse`, `parse` and `validate` on a schema marked with `.async()` now return a `Promise` — both at runtime and at the type level. Previously the compiled Ajv validate function was called synchronously, so async schemas silently reported success without real validation.
- `parse` on an async schema rejects with the validation error; `validate` resolves to a `boolean`.
- `preprocess`/`postprocess`/`refine` functions are applied on the async path as well.
- `~standard` (Standard Schema) `validate` now returns a `Promise` for `$async` schemas, as the spec allows.
- `async()`/`sync()` now record `$async: true`/`$async: false` in the schema type; the new exported `IsSchemaAsync<Schema>` helper drives the promise-aware return types.

### Typed `fromJSON`

`fromJSON` no longer erases types to `AnySchemaBuilder` — it is now generic and preserves the exact schema you pass in:

```ts
// before: merged._schema was `any`, output was `any`
const merged = s.fromJSON({ type: "string", title: "Example" }, s.string());

// after: merged._schema is `{ readonly type: "string"; readonly title: string }`,
// input/output are inferred from the defaults builder (`string`)
```

- Extra literal properties of the passed JSON schema (`title`, `examples`, custom keywords, …) are kept in the resulting schema type.
- Optional properties explicitly set to `undefined` are stripped from the type via `OmitUndefined`.
- When a `defaults` builder is passed, its input/output types drive the resulting builder instead of `any`.

**Migration note:** if you used `.async()` before, wrap parse results with `await` (or switch to `safeParse` and await it) — results are now `Promise`s.
