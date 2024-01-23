---
"ajv-ts": patch
---

make object schema accept object type.

## What's new

### Object

make object schema accept generic object type.

```ts
import s from 'ajv-ts'
type CustomObj = {
  name: string;
  age: number;
}
// Before
const before = s.object<CustomObj>() // error, accept another definition
// After
s.object<CustomObj>() // OK now
```

### Zod compatibility

`describe` - add `description` to your schema. This method for `zod` compatibility.
