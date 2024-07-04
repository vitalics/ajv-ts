import { expect, test, assertType } from 'vitest'

import { array, infer, number, object, s, SchemaBuilder, string } from '../src'

const empty = s.array()
const minTwo = s.array(s.string()).minLength(2);
const maxTwo = s.array(s.string()).maxLength(2);
const justTwo = s.array(s.string()).length(2);
const intNum = s.array(s.string()).nonEmpty();
const nonEmptyMax = s.array(s.string()).nonEmpty().maxLength(2);
const nonEmpty = s.array(s.string()).nonEmpty();


test('types', () => {
  type t0 = s.infer<typeof empty>
  assertType<t0>([])

  type t1 = s.infer<typeof nonEmptyMax>;
  type A= typeof nonEmptyMax

  assertType<t1>(['string', 'sd']);

  // @ts-expect-error numbers are not acepted
  assertType<t1>(['string', 'sd', 123]);

  type t2 = s.infer<typeof minTwo>;


  // @ts-expect-error only 2 or more items
  assertType<t2>(['qwe']);

  assertType<t2>(['qwe', 'zxc']);

  type t3 = s.infer<typeof nonEmpty>
  assertType<t3>(['qwe', 'asd', 'zxcs']);

  type t4 = s.infer<typeof maxTwo>;
  // less items allowed
  assertType<t4>(['1'])
  assertType<t4>(['1', '2'])
  // @ts-expect-error only 2 items allowed
  assertType<t4>(['1', '2', '3'])

  // @ts-expect-error minLength !== length
  s.array().minLength(2).length(3)

  type t5 = s.infer<typeof justTwo>
  assertType<t5>(['asd', 'zxc'])
  // @ts-expect-error expect exact 2 length
  assertType<t5>(['only 1'])
  // @ts-expect-error expect exact 2 length
  assertType<t5>(['only 1', 'asd', 'zxc'])
})

test('create invalid schema', () => {
  // @ts-expect-error error here
  s.array().minLength(2).maxLength(1)
  // @ts-expect-error negative
  expect(() => s.array().length(-2)).toThrow(TypeError)
})

test("passing validations", () => {
  expect(minTwo.schema).toMatchObject({
    type: "array",
    items: {
      type: "string"
    },
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

  assertType<Str>([''])
  assertType<Obj>([{ qwe: 'qwe', num: 123 }, { num: 456 }])
})

test('addItems should append the schema for array', () => {
  const str = empty.addItems(s.string())
  type T = s.infer<typeof str>;
  assertType<T>(['asd', 123, 'a'])
  expect(str.schema).toMatchObject({
    type: 'array',
    minItems: 0,
    items: [{
      type: 'string'
    }]
  })

})

test('addItems should append array of elements for empty definition', () => {
  const empty = s.array()
  expect(empty.schema).toMatchObject({
    type: 'array',
    minItems: 0,
    items: {}
  })
  const nonEmpty = empty.addItems(s.string())
  expect(nonEmpty.schema).toMatchObject({
    type: 'array',
    minItems: 0,
    items: [{ type: 'string' }]
  })
})

test('addItems should replace items=false value', () => {
  const arr = s.array()
  arr.schema.items = false
  arr.addItems(s.string())
  expect(arr.schema).toMatchObject({
    type: 'array',
    minItems: 0,
    items: [{
      type: 'string'
    }]
  })

})

test('element should returns SchemaBuilder instance', () => {
  const elemSchema = nonEmpty.element
  assertType<s.infer<typeof elemSchema>>('asd')
  expect(elemSchema).toBeInstanceOf(s.SchemaBuilder)
  expect(elemSchema.schema).toMatchObject({
    type: 'string'
  })
})
