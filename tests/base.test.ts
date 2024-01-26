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

  const res = myNum.parse(1)

  expect(res).toBe('1')
})

test('preprocess should transform input result', () => {
  const envParsingSchema = s.boolean().preprocess(x => String(x) === 'true' || String(x) === '1')

  expect(envParsingSchema.parse('true')).toBe(true)
})

test('preprocess should throw for unconsistant schema', () => {
  const numberSchema = s.number().preprocess(x => String(x))
  expect(() => numberSchema.parse('hello')).toThrow(Error)
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

test('refine should throws custom error', () => {
  const Schema = s.object({
    active: s.boolean(),
    name: s.string()
  }).array().refine((arr) => {
    const subArr = arr.filter(el => el.active === true)
    if (subArr.length > 1) throw new Error('Array should contains only 1 "active" element')
  })

  const result = Schema.safeParse([{ active: true, name: 'some 1' }, { active: true, name: 'some 2' }])

  expect(result.success).toBeFalse()
  expect(result.error).toBeInstanceOf(Error)
  expect(result.error?.message).toBe('Array should contains only 1 "active" element')
})

test('refine should throws default error', () => {
  const Schema = s.object({
    active: s.boolean(),
    name: s.string()
  }).array().refine((arr) => {
    const subArr = arr.filter(el => el.active === true)
    if (subArr.length > 1) return new Error('Array should contains only 1 "active" element')
  })

  const result = Schema.safeParse([{ active: true, name: 'some 1' }, { active: true, name: 'some 2' }])

  expect(result.success).toBeFalse()
  expect(result.error).toBeInstanceOf(Error)
  expect(result.error?.message).toBe('refine error')
})

test('refine should throws TypeError for not a function', () => {
  // @ts-expect-error
  expect(() => s.number().refine(false)).toThrow(TypeError)
})

test('default should not allow to use in root', () => {
  const num = s.number().default(60000)
  expect(() => num.parse()).toThrow(Error)
})

test('default should support property in object', () => {
  const ObjSchema = s.object({
    age: s.int().default(18)
  })
  const parsed = ObjSchema.parse({})
  expect(parsed).toMatchObject({
    age: 18
  })
})

test('default should support object', () => {
  const ObjSchema = s.object({
    age: s.int().default(18)
  })

  const parsed1 = ObjSchema.parse({})
  expect(parsed1).toMatchObject({
    age: 18
  })

  expect(() => ObjSchema.parse(null)).toThrow(Error)
})

test('should support schema overriding', () => {

  const MyJsonSchema = {
    "title": "Example Schema",
    "type": "object",
    "properties": {
      "name": {
        "type": "string"
      },
      "age": {
        "description": "Age in years",
        "type": "integer",
        "minimum": 0
      },
    },
    "required": ["name", "age"]
  } as const

  type CustomObject = {
    name: string;
    age: number
  }
  const AnySchema = s.any()
  AnySchema.schema = MyJsonSchema

  const parsed = AnySchema.parse({ name: 'hello', age: 18 })
  expect(parsed).toMatchObject({
    name: 'hello',
    age: 18
  })

  const Obj = s.object<CustomObject>()
  Obj.schema = MyJsonSchema
  assertEqualType<s.infer<typeof Obj>, CustomObject>(true)
})

test('should shape update schema property too', () => {
  const NumberSchema = { type: 'number', const: 123 } as const

  const AnySchema = s.any()
  AnySchema.shape = NumberSchema
  expect(AnySchema.schema).toMatchObject(NumberSchema)
})

test('should shema update shape property too', () => {
  const NumberSchema = { type: 'number', const: 123 } as const

  const AnySchema = s.any()
  AnySchema.schema = NumberSchema
  expect(AnySchema.shape).toMatchObject(NumberSchema)
})
