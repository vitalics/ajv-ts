import { test } from 'vitest'

import { s } from '../src'

test("Should have error messages appropriate for the underlying type", () => {
  s.string().minLength(2).nullable().parse(null);
  s.number().gte(2).nullable().parse(null);
  s.boolean().nullable().parse(null);
  s.null().nullable().parse(null);
  s.null().nullable().parse(null);
  s.object({}).nullable().parse(null);
});
