---
"ajv-ts": patch
---

- fix `default` behavior.

Now you can pass `undefined` or `null` and your default values will be applies.

**NOTE:** `default` keyword will be applied for `items` and `properties` definition. That means `default` keyword will works only for `object()` and `array()` builders. See in [ajv](https://ajv.js.org/guide/modifying-data.html#assigning-defaults) docs

Example:

```ts
import s from 'ajv-ts'

const Person = s.object({
  age: s.number().default(18)
})

// Before
Person.parse({}) // throws error

// Now
Person.parse({}) // returns { age: 18 }, default value
```

- `parse`, `safeParse` and `validate` now can be called without arguments.

```ts
import s from 'ajv-ts'

// Before
s.number().safeParse() // Error, required at least 1 argument

// After
s.number().safeParse() // ok now
```

- expose default `Ajv` instance.
