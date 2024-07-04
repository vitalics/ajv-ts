This release contains new cool features.

## New features

- extend `error` method for map custom messages. Originally works from ajv-errors and examples from this docs are works
- check length for `string` and `array` schema. Example:

``` ts
import s from 'ajv-ts'
s.string().minLength(3).maxLength(1) // error. MaxLength < MinLength

s.array().minLength(4).maxLength(2) // error. MaxLength < MinLength

s.string().length(-1) // error. Length is negative
```

- `fromJSON` can eval incoming JSON(or object) and "attach" into schema.
example:

```ts
import s from 'ajv-ts'
const externalSchema = s.fromJSON({someProp: 'YesImCustomProp', type: 'number'}, s.string())
externalSchema.schema.someProp === 'YesImCustomProp' // true
externalSchema.schema.type === 'number' // true
```

## Fixes

- issue with `merge` when old schema(before modified with `merge` function) schema was applies

## Infra

- migrate from bun to pnpm package manager
- update PR steps. Now we use bun@latest, pnpm@9 with node@18, node@20 and node@22 versions.
