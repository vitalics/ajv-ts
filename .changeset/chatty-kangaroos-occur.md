---
"ajv-ts": minor
---

new method: `refine`.

Inspired from `zod`. Set custom validation. Any result exept `undefined` will throws(or exposed for `safeParse` method).

```ts
import s from 'ajv-ts'
// example: object with only 1 "active element"
const Schema = s.object({
active: s.boolean(),
name: s.string()
}).array().refine((arr) => {
  const subArr = arr.filter(el => el.active === true)
  if (subArr.length > 1) throw new Error('Array should contains only 1 "active" element')
})

Schema.parse([{ active: true, name: 'some 1' }, { active: true, name: 'some 2' }]) // throws Error: Array should contains only 1 "active" element
```
