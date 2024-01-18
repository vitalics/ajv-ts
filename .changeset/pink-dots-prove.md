---
"ajv-ts": minor
---

Minor release `0.5` is out!

## Installation/Update

```bash
npm i ajv-ts@latest # npm
yarn add ajv-ts@latest # yarn
pnpm add ajv-ts@latest # pnpm
bun add ajv-ts@latest # bun
```

## New Features

### not, exclude

Now you can mark your schema with `not` keyword!

Here is a 2 differences between `not` and `exclude`.

- `not` method wrap given schema with `not`
- `exclude(schema)` - add `not` keyword for incoming `schema` argument

Example:

```ts
import s from 'ajv-ts'

// not
const notAString = s.string().not() // or s.not(s.string())

notAString.valid('random string') // false, this is a string
notAString.valid(123) // true

// exclude
const notJohn = s.string().exclude(s.const('John'))

notJohn.valid('random string') // true
notJohn.valid('John') // false, this is John

// advanced usage

const str = s.string<'John' | 'Mary'>().exclude(s.const('John'))
s.infer<typeof str> // 'Mary'
```

### keyof

New function that can be used in a root. Same as `keyof T` in Typescript.

**NOTE:** currenty works only with objects only, this behavior will be fixed in future releases.

Example:

```ts
import s from 'ajv-ts'

const keys = s.keyof(s.object({
  key1: s.string(),
  key2: s.object({})
}))

type Result = s.infer<typeof keys> // 'key1' | 'key2'

keys.schema // { anyOf: [ { cosnt: 'key1' }, {const: 'key2' } ] }
```

### Never

Same as `never` type in Typescript. JSON-schema equivalent is `{not: {}}`.

## Fixes

- `s.number()` - now generic!
- `s.boolean()` - now generic!

### Array

#### empty schema definition

function can be called without schema definition

```ts
import s from 'ajv-ts'
// before 0.5
s.array() // error

// 0.5 and later
s.array() // OK, deinition is not required anymore!
```

### pushItems

push(append) schema to array(parent) schema.

Example:

```ts
import s from 'ajv-ts'

const empty = s.array()
const stringArr = empty.addItems(s.string())

stringArr.schema // {type: 'array', items: [{ type: 'string' }]}
```

#### minContains/maxContains

Improve typescript generics usage. Now you cannot set float or negative values.

Example:

```ts
import s from 'ajv-ts'

// Before 0.5
s.array(s.number()).minContains(-1) // Typescript was silent

// After 0.5
s.array(s.number()).minContains(-1) // Typescript error: `Argument of type 'number' is not assignable to parameter of type '[never, 'TypeError: "minContains" should be positive integer', "Received: '-1'"]'.`
```

## JS Doc updates

Update and add JS Doc for:

- `nullable` - update
- `array` - update
- `validate` - update
- `parse` - update
- `number().const()` - update
- `array().contains()` - add
- `const()` - add
- `any()` - update
- `unknown` - update
- `create` - update
