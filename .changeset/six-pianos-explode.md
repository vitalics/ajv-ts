---
"ajv-ts": patch
---

Add async keyword support

example:

```ts
const obj = s.object({}).async()

obj.schema // {type: 'object', $async: true}
```

## fixes/refactories

- refactor `safeParse` logic.
