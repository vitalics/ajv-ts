import { test, expect } from 'vitest'

import s from '../src'

test('#61 enum with constant values should work', () => {

  const externalJSONSchema = {
    anyOf: [{ const: 'lt' }, { const: 'gt' }],
  }
  const schema1 = s.fromJSON(externalJSONSchema);

  const schema2 = s.union(s.literal('lt'), s.literal('gt'));

  expect(schema2.schema).toStrictEqual(externalJSONSchema);

  expect(schema1.parse('gt')).toBe('gt'); // gt
  expect(schema1.parse('lt')).toBe('lt'); // lt

  expect(schema2.parse('gt')).toBe('gt');
})
