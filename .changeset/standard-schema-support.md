---
"ajv-ts": minor
---

feat: support [Standard Schema](https://standardschema.dev). Every schema builder now exposes the `~standard` property (`StandardSchemaV1`), so schemas can be passed to any Standard Schema-compatible tool without adapters.

Example:

```ts
import type { StandardSchemaV1 } from "@standard-schema/spec";

const schema = s.object({ name: s.string() });

const standard: StandardSchemaV1 = schema; // OK

standard["~standard"].validate({ name: "John" }); // { value: { name: "John" } }
standard["~standard"].validate({ name: 42 }); // { issues: [{ message: "must be string", path: ["name"] }] }
```
