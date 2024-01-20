import Ajv from 'ajv';
import { test, expect } from 'bun:test'

import s from '../src'
import { assertEqualType } from '../src/utils';

test("type guard", () => {
  const str = s.string();

  const s1 = s.object({
    stringToNumber: str,
  });
  type t1 = s.input<typeof s1>;

  const data = { stringToNumber: "asdf" };
  const parsed = s1.safeParse(data);
  if (parsed.success) {
    assertEqualType<typeof data, t1>(true);
  }
});

test('should support AJV custom ajv instance', () => {
  const newAjv = new Ajv()

  const newS = s.create(newAjv)

  const a = newS.number()

  expect(a.ajv).toBe(newAjv)
  expect(a.ajv).toBeInstanceOf(Ajv)
})

test('postProcess should should transform output result', () => {
  const myNum = s.number().postprocess(v => String(v), s.string())

  expect(myNum.parse(1)).toBe('1')
})


test("test this binding", () => {
  const callback = (predicate: (val: string) => boolean) => {
    return predicate("hello");
  };

  expect(callback((value) => s.string().safeParse(value).success)).toBe(true); // true
  expect(callback((value) => s.string().safeParse(value).success)).toBe(true); // true
});

test('cusom error support', () => {
  const schema = s.number().error('this is not a number')

  const { error } = schema.safeParse("not a number")

  expect(error).toBeInstanceOf(Error)
  expect(error?.message).toBe("this is not a number")
  expect(error?.cause).toBeDefined()
})

test('keyof support', () => {
  const keys = s.keyof(s.object({
    a: s.string(),
    b: s.object({
      c: s.number(),
    })
  }))
  expect(keys.schema).toMatchObject({
    anyOf: [{
      const: 'a'
    }, {
      const: 'b'
    }]
  })
})

test('never support', () => {
  const never = s.never()
  expect(never.schema).toMatchObject({
    not: {},
  })
})

test('not function support', () => {
  const notString = s.not(s.string())

  expect(notString.schema).toMatchObject({
    not: { type: "string" }
  })

  const okNumber = notString.validate(42)
  const okObject = notString.validate({ "key": "value" })
  const failString = notString.validate("I am a string")
  expect(okNumber).toBeTrue()
  expect(okObject).toBeTrue()
  expect(failString).toBeFalse()
})

test('not builder support', () => {
  const notStringSchema = s.string().not()

  expect(notStringSchema.schema).toMatchObject({
    not: { type: 'string' }
  })
  expect(notStringSchema.validate(52)).toBeTrue()
  expect(notStringSchema.validate('random string')).toBeFalse()
})

test('exclude builder support', () => {
  const res = s.string().exclude(s.const('Jerry'))
  expect(res.schema).toMatchObject({
    type: 'string',
    not: { const: 'Jerry' }
  })

  expect(res.validate('random string')).toBeTrue()

  expect(res.validate(123)).toBeFalse()
  expect(res.validate('Jerry')).toBeFalse()

  s.object({
    a: s.number()
  }).and(s.object({
    b: s.string()
  }))['_output']
})

test('should throws for "undefined" value for nullable schema', () => {
  const str = s.string().nullable()

  expect(() => str.parse(undefined)).toThrow(Error)
})

test('async schema', () => {
  const Schema = s.object({
    name: s.string()
  }).async()

  const a = Schema.parse({ name: 'hello' })
  expect(Schema.schema).toMatchObject({
    type: 'object',
    $async: true,
    properties: {
      name: { type: 'string' }
    }
  })

  expect(a.name).toBe('hello')
})

test('make sync schema', () => {
  const async = s.object({}).async()

  expect(async.schema).toMatchObject({
    $async: true,
    type: 'object',
    properties: {},
  })
  const sync = async.sync()

  expect(sync.schema).toMatchObject({
    type: 'object',
    $async: false,
    properties: {},
  })


  const syncRemoved = sync.sync(true)
  expect(syncRemoved.schema).toMatchObject({
    type: 'object',
    properties: {},
  })
})
