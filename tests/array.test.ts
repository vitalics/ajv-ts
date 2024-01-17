import { expect, test } from 'bun:test'

import { s } from '../src'
import { assertEqualType } from '../src/utils'

const empty = s.array()
const minTwo = s.array(s.string()).minLength(2);
const maxTwo = s.array(s.string()).maxLength(2);
const justTwo = s.array(s.string()).length(2);
const intNum = s.array(s.string()).nonEmpty();
const nonEmptyMax = s.array(s.string()).nonEmpty().maxLength(2);
type t1 = s.infer<typeof nonEmptyMax>;
assertEqualType<[string, ...string[]], t1>(true);

type t2 = s.infer<typeof minTwo>;
assertEqualType<string[], t2>(true);

test("passing validations", () => {
  expect(minTwo.schema).toMatchObject({
    type: "array",
    items: [
      {
        type: "string"
      }
    ],
    minItems: 2
  })
  minTwo.parse(["a", "a"]);
  minTwo.parse(["a", "a", "a"]);
  maxTwo.parse(["a", "a"]);
  maxTwo.parse(["a"]);
  justTwo.parse(["a", "a"]);
  intNum.parse(["a"]);
  nonEmptyMax.parse(["a"]);
});

test("get element", () => {
  expect(() => justTwo.element?.parse(12)).toThrow();
});

test("parse should fail given sparse array", () => {
  const schema = s.array(s.string()).nonEmpty().minLength(1).maxLength(3);

  expect(() => schema.parse(new Array(3))).toThrow();
});


test('invariant for array schema', () => {
  const str = s.string().array()
  const obj = s.object({
    qwe: s.string().optional(),
    num: s.number(),
  }).array()

  type Obj = s.infer<typeof obj>

  type Str = s.infer<typeof str>

  assertEqualType<Str, string[]>(true)
  assertEqualType<Obj, { qwe?: string, num: number }[]>(true)
})