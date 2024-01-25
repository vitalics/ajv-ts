This release contains zod compatibility.

## Zod Compatibility

- expose `nativeEnum` function.
- expose `literal` function, this is the same as `const` does.
- expose `shape` property. It's connected with `schema` property. That means if you update `schema` property, it updates `shape` property too and vise versa.

## Fixes

`describe` now returns `SchemaBuilder`; was `void`.
