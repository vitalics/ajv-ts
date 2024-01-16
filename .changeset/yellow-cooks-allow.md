---
"ajv-ts": minor
---

# Description

Add support for custom error message for any error.

Example:

```ts
import s from 'ajv-ts'

const num = s.number().error('cannot be not a number')

const res1 = num.safeParse("some random string")
const res2 = num.safeParse("1.2")
console.error(res1.error.message) // cannot be not a number
console.error(res2.error.message) // cannot be not a number

res1.error instanceof Error // true
```

## What's new

new feature: add support custom error message

## Fixes

fix: issue with typescript [#21](https://github.com/vitalics/ajv-ts/issues/21)

## Thanks

[@rjvim](https://github.com/rjvim) for submitting the issue
