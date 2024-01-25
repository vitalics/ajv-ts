---
"ajv-ts": patch
---

This release contains zod compatibility

## Zod Compatibility

- expose `nativeEnum` function.
- expose `literal` function, this is the same as `const` does.

## Fixes

`describe` now returns `SchemaBuilder`; was `void`.
