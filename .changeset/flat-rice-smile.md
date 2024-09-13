---
"ajv-ts": minor
---

Add `example` for every schema.

Example:

```ts
s.string().examples(["str1", 'string 2']) // OK
s.number().examples(["str1", 'string 2']) // Error in typescript, but OK
s.number().examples([1, 2, 3]) // OK
s.number().examples(1, 2, 3) // OK
```
