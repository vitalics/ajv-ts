---
"ajv-ts": minor
---

This release contains new cool features.

## New features

- extend `error` method for map custom messages(#54). Originally works from ajv-errors and examples from this docs are works
examples:

```ts
import s from 'ajv-ts'

const s1 = s.string().error({ _: "any error here" })

s.parse(123) // throws "any error here"

s.string().error({ _: "any error here", type: "not a string. Custom" })

s.parse(123) // throws "not a string. Custom"

const Obj = s
  .object({ foo: s.string(),})
  .strict()
  .error({ additionalProperties: "Not expected to pass additional props" });

Obj.parse({foo: 'ok', bar: true}) // throws "Not expected to pass additional props"
```

One more example:

```ts
const Schema = s
    .object({
      foo: s.integer().minimum(2),
      bar: s.string().minLength(2),
    })
    .strict()
    .error({
      properties: {
        foo: "data.foo should be integer >= 2",
        bar: "data.bar should be string with length >= 2",
      },
    });
Schema.parse({ foo: 1, bar: "a" }) // throws: "data.foo should be integer >= 2"
```

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
