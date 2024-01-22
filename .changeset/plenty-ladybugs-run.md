---
"ajv-ts": patch
---

- fix `default` behavior.

Now you can pass `undefined` or `null` and your default values will be applies.

Example:

```ts
import s from 'ajv-ts'

const num = s.number().default(200)

// Before
num.parse(undefined) // throws error

// Now
num.parse(undefined) // returns 200, default value
```

- `parse`, `safeParse` and `validate` now can be called without arguments.

```ts
import s from 'ajv-ts'

// Before
s.number().safeParse() // required at least 1 argument

// After
s.number().safeParse() // ok now
```
