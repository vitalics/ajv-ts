---
"ajv-ts": patch
---

Add `async` keyword support

example:

```ts
const obj = s.object({}).async()

obj.schema // {type: 'object', $async: true}
// make sync schema
obj.sync() // {type: 'object', $async: false}

// or completely remove the `$async` keyword form schema
obj.sync(true) // {type: 'object'}
```

## fixes/refactories

- refactor `safeParse` logic.
- update JSDoc for `default` method
