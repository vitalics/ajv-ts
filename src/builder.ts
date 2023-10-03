import Ajv from 'ajv'
import addFormats from 'ajv-formats'

import type { UnionToTuple, UnionToIntersection, Object as ObjectTypes, } from './types/index'
import type { BaseSchema, AnySchemaOrAnnotation, BooleanSchema, NumberSchema, ObjectSchema, StringSchema, ArraySchema, EnumAnnotation, NullSchema, ConstantAnnotation, AnySchema } from './schema/types'
import { Create, CreateBetween } from './types/array'

export const DEFAULT_AJV = addFormats(new Ajv({}))
/** Any schema builder. */
type AnySchemaBuilder =
  | NumberSchemaBuilder
  | StringSchemaBuilder
  | BooleanSchemaBuilder
  | NullSchemaBuilder
  | ObjectSchemaBuilder
  | RecordSchemaBuilder
  | ArraySchemaBuilder
  | TupleSchemaBuilder
  | EnumSchemaBuilder
  | ConstantSchemaBuilder
  | UnionSchemaBuilder
  | IntersectionSchemaBuilder

type IsFloat<N extends number | string> = N extends number
  ? IsFloat<`${N}`>
  : N extends `${number}.${number extends 0 ? '' : number}`
  ? true
  : false

type IsNegative<N extends number | string> = N extends number
  ? IsNegative<`${N}`>
  : N extends `-${number}`
  ? true
  : false

type IsPositiveInteger<N extends number | string> = IsFloat<N> extends true
  ? false
  : IsNegative<N> extends true
  ? false
  : true

type MetaObject = Pick<BaseSchema, 'title'> &
  Pick<BaseSchema, 'description'> &
  Pick<BaseSchema, 'deprecated'> &
  Pick<BaseSchema, '$id'>

export type SafeParseResult<T> = SafeParseSuccessResult<T> | SafeParseErrorResult

export type SafeParseSuccessResult<T> = {
  success: true;
  data: T;
  input: unknown
}
export type SafeParseErrorResult = {
  success: false
  error: Error
  input: unknown
}

abstract class SchemaBuilder<
  Input = unknown,
  Schema extends AnySchemaOrAnnotation = AnySchemaOrAnnotation,
  Output = Input,
> {
  /**
   * type helper. Do Not Use!
   */
  _input!: Input

  /**
   * type helper. Do Not Use!
   */
  _output!: Output

  /**
   * JSON-schema representation
   */
  readonly schema: Schema

  get ajv() {
    return this._ajv
  }
  set ajv(instance: Ajv) {
    if (!(instance instanceof Ajv)) {
      throw new TypeError(`Cannot set ajv variable for non-ajv instance.`, { cause: { type: typeof instance, value: instance } })
    }
    this._ajv = instance
  }

  constructor(schema: Schema, private _ajv = DEFAULT_AJV) {
    this.schema = schema
  }
  protected isNullable = false


  /**
   * Marks your property as nullable (`undefined`)
   * 
   * **NOTES**: since in json-schema no difference between null and undefined - it's just for TS types
   */
  optional(): SchemaBuilder<Input, Schema, Output | undefined> {
    return this.nullable() as never
  }

  /**
   * Marks your property as nullable (`null`)
   */
  nullable(): SchemaBuilder<Input, Schema, Output | null> {
    this.isNullable = true;
    (this.schema as any).nullable = true
    const type = (this.schema as any).type
    if (Array.isArray(type)) {
      (this.schema as any).type = [...new Set([...type, 'null'])]
    } else {
      (this.schema as any).type = [...new Set([type, 'null'])]
    }
    return this as never
  }

  private preFns: Function[] = []

  /**
   * Add preprocess function for incoming result.
   * 
   * **NOTE:** this functions works BEFORE parsing. use it at own risk. (e.g. transform Date object into string)
   * @example
   * const myString = s.string().preprocess(v => {
   *   // if date => transform to ISO string
   *   if(v instanceof Date) {
   *     return Date.toISOString()
   *   }
   *  // do nothing if not a date
   *   return v
   * })
   * const res = myString.parse(new Date()) // '2023-09-23T07:10:57.881Z'
   * const res = myString.parse('qwe') // 'qwe'
   * const res = myString.parse({}) // error: not a string
   */
  preprocess(fn: (x: unknown) => unknown) {
    if (typeof fn !== 'function') {
      throw new TypeError(`Cannot use not a function for pre processing.`, { cause: { type: typeof fn, value: fn } })
    }
    this.preFns.push(fn)
    return this
  }

  private postFns: { fn: Function, schema: AnySchemaBuilder }[] = []
  /**
   * Post process. Use it when you would like to transform result after parsing is happens
   */
  postprocess<S extends AnySchemaBuilder = AnySchemaBuilder>(fn: (input: Input) => unknown, schema: S): S {
    if (typeof fn !== 'function') {
      throw new TypeError(`Cannot use not a function for pre processing.`, { cause: { type: typeof fn, value: fn } })
    }
    this.postFns.push({ fn, schema })
    return this as never
  }

  protected abstract precheck(arg: unknown): arg is Input

  /**
   * Meta object. Add additional fields in your schema
   */
  meta(obj: MetaObject) {
    if ('type' in this.schema) {
      if (obj.deprecated) {
        this.schema.deprecated = obj.deprecated
      }
      if (obj.description) {
        this.schema.description = obj.description
      }
      if (obj.title) {
        this.schema.title = obj.title
      }
      if (obj.$id) {
        this.schema.$id = obj.$id
      }
    }
    return this
  }

  /** Define default value */
  default(value: Output) {
    (this.schema as AnySchema).default = value
    return this;
  }

  /**
   * Parse you input result. Used `ajv.validate` under the hood
   * 
   * It also applies your `postProcess` functions if parsing was successfull
   */
  safeParse(input: unknown): SafeParseResult<Output> {
    // need to remove schema, or we get precompiled result. It's bad for `extend` and `merge` in object schema
    this.ajv.removeSchema(this.schema)
    let transformed;
    if (Array.isArray(this.preFns) && this.preFns.length > 0) {
      try {
        transformed = this.preFns.reduce((prevResult, fn) => {
          return fn(prevResult)
        }, input)
      } catch (e) {
        return {
          success: false,
          error: new Error((e as Error).message, { cause: e }),
          input,
        }
      }
    } else {
      transformed = input
    }

    const precheckValid = this.precheck(transformed)
    if (!precheckValid) {
      return {
        error: new Error(
          `Validation error: precheck condition for "${this.constructor.name
          }" constructor is failed. Received: ${transformed} with type "${typeof transformed}"`,
        ),
        success: false,
      } as SafeParseErrorResult
    }
    try {
      const valid: boolean = this.ajv.validate(this.schema, transformed)
      if (!valid) {
        const firstError = this.ajv.errors?.at(0)
        return {
          error: new Error(firstError?.message, { cause: firstError }),
          success: false,
          input: transformed
        }
      }
      if (Array.isArray(this.postFns) && this.postFns.length > 0) {
        const output = this.postFns.reduce((prevResult, { fn, schema }) => {
          const result = schema.safeParse(fn(prevResult))
          if (result.success) {
            return result.data
          }
          throw result.error
        }, transformed)
        return {
          success: true,
          data: output as Output,
          input: transformed
        }
      }
      return {
        success: true,
        data: transformed as Output,
        input: transformed
      }
    } catch (e) {
      return {
        error: new Error((e as Error).message, { cause: e }),
        success: false,
        input: transformed
      }
    }
  }

  validate(input: unknown): input is Output {
    const { success } = this.safeParse(input)
    return success
  }

  parse(input: unknown): Output {
    const result = this.safeParse(input)
    if (!result.success) {
      throw result.error
    }
    return result.data
  }
}
class NumberSchemaBuilder extends SchemaBuilder<number, NumberSchema> {
  protected precheck(arg: unknown): arg is number {
    if (typeof arg === 'number') {
      return true
    }
    if ((arg === null || arg === undefined) && this.isNullable) {
      return true
    }
    return false
  }

  constructor() {
    super({ type: 'number' })
  }
  private setType(type: string): () => this {
    return () => {
      this.schema.type = type as never
      return this
    }
  }


  /**
   * signed byte value (-128 .. 127)
   * 
   * Set schema `{type: 'int8'}`
   */
  int8 = this.setType('int8')
  /**
   * unsigned byte value (0 .. 255)
   * 
   * Set schema `{type: 'uint8'}`
   */
  uint8 = this.setType('uint8')
  /**
   * signed word value (-32768 .. 32767),
   * 
   * Set schema `{type: 'int16'}`
   */
  int16 = this.setType('int16')
  /**
   * unsigned word value (0 .. 65535)
   *
   * Set schema `{type: 'uint16'}`
   */
  uint16 = this.setType('uint16')
  /** 
   * signed 32-bit integer value
   * 
   * Set schema `{type: 'int32'}`
   * 
   */
  int32 = this.setType('int32')
  /**
   * unsigned 32-bit integer value
   * 
   * Set schema `{type: 'uint32'}`
   */
  uint32 = this.setType('uint32')
  /**
   * 32-bit real number
   * 
   * Set schema `{type: 'float32'}`
   */
  float32 = this.setType('float32')
  /**
   * 64-bit real number
   * 
   * Set schema `{type: 'float64'}`
   */
  float64 = this.setType('float64')
  /**
   * change schema type from `any integer number` to `any number`.
   * 
   * Set schema `{type: 'number'}`
   * 
   * This is default behavior
   */
  number = this.setType('number')

  /** Set schema `{type: 'integer'}` */
  integer = this.setType('integer')

  /**
   * Appends format for your number schema.
   */
  format(type: NumberSchema['format']) {
    this.schema.format = type
    return this
  }

  get minValue() {
    return this.schema.minimum || this.schema.exclusiveMinimum as number || null
  }

  get maxValue() {
    return this.schema.maximum || this.schema.exclusiveMaximum as number || null
  }

  min = this.minimum
  /** 
   * Provides minimum value
   *
   * Set schema `minimum = value` (and add `exclusiveMinimum = true` if needed)
   */
  minimum(value: number, exclusive = false) {
    if (exclusive) {
      this.schema.exclusiveMinimum = value
    } else {
      this.schema.minimum = value
    }
    return this
  }

  step = this.multipleOf

  /**
   * Numbers can be restricted to a multiple of a given number, using the `multipleOf` keyword.
   * It may be set to any positive number. Same as `step`.
   *
   * **NOTE**: Since JSON schema odes not allow to use `multipleOf` with negative value - we use `Math.abs` to transform negative values into positive
   * @see {@link NumberSchemaBuilder.step step}
   * @example
   * const a = s.number().multipleOf(10)
   * 
   * a.parse(10) // ok
   * a.parse(9) // error
   * 
   * const b = s.number().multipleOf(-0.1)
   * b.parse(1.1) // ok, step is `0.1`
   * b.parse(1) // error, step is not `0.1`
   */
  multipleOf(value: number) {
    this.schema.multipleOf = Math.abs(value)
    return this
  }

  max = this.maximum
  /**
   * marks you number maximum value
   */
  maximum(value: number, exclusive = false) {
    if (exclusive) {
      this.schema.exclusiveMaximum = value
    } else {
      this.schema.maximum = value
    }
    return this
  }
  /**
   * Greater than
   *
   * @see {@link NumberSchemaBuilder.maximum}
   * @see {@link NumberSchemaBuilder.gte}
   */
  gt(value: number) {
    return this.minimum(value, true);
  }
  /**
   * Greater than or equal
   *
   * Range: `[value; Infinity)`
   * @see {@link NumberSchemaBuilder.maximum maximum}
   * @see {@link NumberSchemaBuilder.gt gt}
   */
  gte(value: number) {
    return this.minimum(value)
  }
  /**
   * Less than
   * 
   * Range: `(value; Infinity]`
   * @see {@link NumberSchemaBuilder.minimum minimum}
   * @see {@link NumberSchemaBuilder.lte lte}
   */
  lt(value: number) {
    return this.max(value, true)
  }
  /**
   * Less than or Equal
   *
   * Range: `[value; Infinity)`
   * @see {@link NumberSchemaBuilder.minimum}
   * @see {@link NumberSchemaBuilder.lt}
   */
  lte(value: number) {
    return this.max(value)
  }
  /** Any positive number (greater than `0`)
   * Range: `(0; Infinity]`
   */
  positive() {
    return this.gt(0)
  }
  /** Any non negative number (greater than or equal `0`)
   *
   * Range: `[0; Inifnity]`
   */
  nonnegative() {
    return this.gte(0)
  }
  /** Any negative number (less than `0`)
  *
  * Range: `[Inifinity; 0)`
  */
  negative() {
    return this.lt(0)
  }
  /** Any non postive number (less than or equal `0`)
  *
  * Range: `(Inifinity; 0]`
  */
  nonpositive() {
    return this.lte(0)
  }
  /** Marks incoming number between `MAX_SAFE_INTEGER` and `MIN_SAFE_INTEGER` */
  safe() {
    return this.lte(Number.MAX_SAFE_INTEGER).gte(Number.MIN_SAFE_INTEGER)
  }
}
/**
 * Construct `number` schema.
 * 
 * **NOTE:** By default Ajv fails `{"type": "number"}` (or `"integer"`) 
 * validation for `Infinity` and `NaN`.
 * 
 * @example
 * const test1 = s.number()
 * 
 * test1.parse(1) // ok
 * test1.parse('qwe') // error
 */
function number() {
  return new NumberSchemaBuilder()
}

/**
 * construct `integer` schema.
 * 
 * Same as `s.number().integer()`
 * 
 * **NOTE:** By default Ajv fails `{"type": "integer"}` validation for `Infinity` and `NaN`.
 */
function integer() {
  return new NumberSchemaBuilder().integer()
}

class StringSchemaBuilder extends SchemaBuilder<string, StringSchema> {
  protected precheck(arg: unknown): arg is string {
    if (
      !!this.isNullable &&
      (typeof arg === 'string' || typeof arg === 'undefined' || arg === null)
    ) {
      return true
    }
    if (typeof arg === 'string') {
      return true
    }
    return false
  }

  pattern<Pattern extends string = string>(
    regex: RegExp | string,
  ): SchemaBuilder<string, StringSchema, `${Pattern}`> {
    if (typeof regex === 'string') {
      this.schema.pattern = `^${regex}$`
    } else {
      this.schema.pattern = `^${regex.source}$`
    }
    return this as SchemaBuilder<string, StringSchema, `${Pattern}`>
  }

  constructor() {
    super({ type: 'string' })
  }

  /**
   * Define minimum string length
   */
  minLength<L extends number, Valid = IsPositiveInteger<L>>(
    value: Valid extends true
      ? L
      : [
        never,
        'Type Error. Only Positive and non floating numbers are supported.',
        `Received: '${L}'`,
      ],
  ) {
    this.schema.minLength = value as L
    return this
  }

  /**
   * Define maximum string length
   */
  maxLength<L extends number, Valid = IsPositiveInteger<L>>(
    value: Valid extends true
      ? L
      : [
        never,
        'Type Error. Only Positive and non floating numbers are supported.',
        `Received: '${L}'`,
      ],
  ) {
    this.schema.maxLength = value as L
    return this
  }
  /**
   * Define exact string length
   * @see {@link StringSchemaBuilder.minLength minLength}
   * @see {@link StringSchemaBuilder.maxLength maxLength}
   * @example
   * const exactStr = s.string().length(3)
   * exactStr.parse('qwe') //Ok
   * exactStr.parse('qwer') // Error
   * exactStr.parse('go') // Error
   */
  length<L extends number, Valid = IsPositiveInteger<L>>(
    value: Valid extends true
      ? L
      : [
        never,
        'Type Error. Only Positive and non floating numbers are supported.',
        `Received: '${L}'`,
      ],
  ) {
    return this.maxLength(value).minLength(value)
  }
  /** 
   * Define non empty string. Same as `minLength(1)`
   */
  nonEmpty() {
    return this.minLength(1)
  }

  email() {
    return this.format('email')
  }
  ipv4() {
    return this.format('ipv4')
  }

  format(formatType: StringSchema['format']): Omit<this, 'format'> {
    this.schema.format = formatType
    return this
  }
}

/**
 * Construct `string` schema
 */
function string() {
  return new StringSchemaBuilder()
}

class BooleanSchemaBuilder extends SchemaBuilder<boolean, BooleanSchema> {
  protected precheck(arg: unknown): arg is boolean {
    if (typeof arg === 'boolean') {
      return true
    } if ((arg === null || arg === undefined) && this.isNullable) {
      return true
    }
    return false
  }

  constructor() {
    super({ type: 'boolean' })
  }
}
/**
 * Construct `boolean` schema
 */
function boolean() {
  return new BooleanSchemaBuilder()
}

class NullSchemaBuilder extends SchemaBuilder<null, NullSchema> {
  constructor() {
    super({ type: 'null' })
  }

  protected precheck(arg: unknown): arg is null {
    if (arg === null || arg === undefined) {
      return true
    }
    return false
  }
}
function nil() {
  return new NullSchemaBuilder()
}

type ObjectDefinition = { [key: string]: SchemaBuilder }
type Merge<F, S> = Omit<F, keyof S> & S
class ObjectSchemaBuilder<
  Definition extends ObjectDefinition = ObjectDefinition,
  T = { [K in keyof Definition]: Infer<Definition[K]> }
> extends SchemaBuilder<T, ObjectSchema, ObjectTypes.OptionalUndefined<T>> {
  protected precheck(arg: unknown): arg is T {
    if (typeof arg === 'object' && arg !== null) {
      return true
    } if ((arg === null || arg === undefined) && this.isNullable) {
      return true
    }
    return false
  }

  constructor(private def: Definition) {
    super({
      type: 'object',
      properties: {},
      required: [],
    })
    Object.entries(def).forEach(([key, d]) => {
      this.schema.properties![key] = d.schema
    })
  }

  /**
   * set `additionalProperties=true` for your JSON-schema.
   * 
   * Opposite of `strict`
   * @see {@link ObjectSchemaBuilder.strict strict}
   */
  passthrough(): ObjectSchemaBuilder<Definition, ObjectTypes.IndexType<T>> {
    this.schema.additionalProperties = true
    return this as never
  }
  /**
   * Makes all properties partial(not required)
   */
  partial(): ObjectSchemaBuilder<Definition, Partial<T>> {
    this.schema.required = []
    return this as never
  }

  /**
   * Makes selected properties partial(not required), rest of them are not changed.
   * 
   * Same as for as for `requiredFor('item1').requiredFor('item2')...etc`
   * 
   * @example
   * const Test = s.object({
   *  name: s.string(),
   *  email: s.string(),
   * })
   * .required()
   * .partialFor('email')
   * 
   * Test.schema === {
   *  type: 'object',
   *  properties: {
   *    "name": {type: 'string'},
   *    "email": {type: 'string'}
   *  }
   *  "required": ['name']
   * }
   */
  partialFor<Key extends keyof T = keyof T>(
    key: Key,
  ): ObjectSchemaBuilder<Definition, ObjectTypes.OptionalByKey<T, Key>> {
    const required = this.schema.required as string[]
    const findedIndex = required.indexOf(key as string)
    // remove element from array. e.g. "email" for ['name', 'email'] => ['name']
    // opposite of push
    if (findedIndex !== -1) {
      (this.schema.required as string[]).splice(findedIndex, 1)
    }
    return this as never
  }

  /**
   * The `dependentRequired` keyword conditionally requires that
   * certain properties must be present if a given property is
   * present in an object. For example, suppose we have a schema
   * representing a customer. If you have their credit card number,
   * you also want to ensure you have a billing address.
   * If you don't have their credit card number, a billing address
   * would not be required. We represent this dependency of one property
   * on another using the `dependentRequired` keyword.
   * The value of the `dependentRequired` keyword is an object.
   * Each entry in the object maps from the name of a property, p,
   * to an array of strings listing properties that are required
   * if p is present.
   *
   * In the following example,whenever a `credit_card` property is provided,
   * a `billing_address` property must also be present:
   * @example
   * const Test1 = s.object({
   * name: s.string(),
   * credit_card: s.number(),
   * billing_address: s.string(),
   * }).requiredFor('name').dependentRequired({
   *   credit_card: ['billing_address'],
   * })
   * Test1.schema === {
   *   "type": "object",
   *   "properties": {
   *     "name": { "type": "string" },
   *     "credit_card": { "type": "number" },
   *     "billing_address": { "type": "string" }
   *   },
   *   "required": ["name"],
   *   "dependentRequired": {
   *     "credit_card": ["billing_address"]
   *   }
   * }
   */
  dependentRequired<Deps = { [K in keyof T]?: Exclude<keyof T, K>[] }>(dependencies: Deps): ObjectSchemaBuilder<Definition, ObjectTypes.OptionalByKey<T, ObjectTypes.InferKeys<Deps> extends keyof T ? ObjectTypes.InferKeys<Deps> : keyof T>> {
    this.schema.dependentRequired = dependencies as never
    return this as never
  }

  /**
   * Disallow additional properties for object schema `additionalProperties=false`
   *
   * If you would like to define additional properties type - use `additionalProeprties`
   * @see {@link ObjectSchemaBuilder.additionalProperties additionalProperties}
   */
  strict() {
    this.schema.additionalProperties = false
    return this
  }

  /**
   * Makes 1 property required, other keys are not required.
   * 
   * If some properties is already marked with `requiredFor` - we append new key into `required` JSON schema
   */
  requiredFor<Key extends keyof T = keyof T>(
    key: Key,
  ): ObjectSchemaBuilder<Definition, ObjectTypes.RequiredByKeys<T, Key>> {
    this.schema.required = [
      ...new Set([...this.schema.required!, key as string]),
    ]
    return this as never
  }

  /**
   * Make **ALL** properties in your object required.
   * 
   * If you need to make 1 property required - use {@link ObjectSchemaBuilder.requiredFor}
   */
  required(): ObjectSchemaBuilder<Definition, Required<T>> {
    const allProperties = Object.keys(this.schema.properties!)
    // keep unique only
    this.schema.required = [
      ...new Set([...this.schema.required!, ...allProperties]),
    ]
    return this as never
  }

  /**
   * Define schema for additional properties
   *
   * If you need to make `additionalProperties=false` => use `strict` method
   *
   * @see {@link ObjectSchemaBuilder.strict}
   */
  additionalProperties<S extends AnySchemaBuilder>(
    def: S,
  ): ObjectSchemaBuilder<
    Definition & S,
    { [K in keyof T]: T[K] } & { [key: string]: Infer<S> }
  > {
    this.schema.additionalProperties = def.schema
    return this as never
  }

  optionalProperties<Def extends ObjectDefinition = ObjectDefinition>(def: Def): ObjectSchemaBuilder<Definition & Partial<Def>, T & { [K in keyof Def]?: Infer<Def[K]> }> {
    if (!this.schema.optionalProperties) {
      this.schema.optionalProperties = {}
    }
    Object.entries(def).forEach(([key, d]) => {
      this.schema.optionalProperties![key] = d.schema
    })
    return this as never
  }

  /**
   * Merge current object with another object definition
   * @example
   * const a = s.object({num: s.number()})
   * const b = s.object({str: s.string()})
   * const c = a.merge(b)
   * type C = s.infer<typeof c> // {num: number; str: string}
   */
  merge<Def extends ObjectDefinition = ObjectDefinition, ObjSchema extends ObjectSchemaBuilder<Def> = ObjectSchemaBuilder<Def>>(schema: ObjSchema): ObjectSchemaBuilder<Merge<Definition, Def>, Merge<this['_output'], ObjSchema['_output']>> {
    Object.entries(schema.schema).forEach(([key, def]) => {
      this.schema.properties![key] = def.schema
    })
    return this as never
  }
  /**
   * Same as `merge`, but not accepts `s.object`.
   * @example
   * const a = s.object({num: s.number()})
   * const c = a.extend({str: s.string()})
   * type C = s.infer<typeof c> // {num: number; str: string}
   */
  extend<ObjDef extends ObjectDefinition = ObjectDefinition>(def: ObjDef): ObjectSchemaBuilder<Merge<Definition, ObjDef>> {
    Object.entries(def).forEach(([key, def]) => {
      this.schema.properties![key] = def.schema
    })
    return this as never
  }

  /**
   * Mark object as `readOnly`. It mostly decoration for typescript.
   */
  readonly(): ObjectSchemaBuilder<Definition, Readonly<T>> {
    this.schema.readOnly = true
    return this as never
  }

  /**
   * Inspired by TypeScript's built-in `Pick` and `Omit` utility types,
   * all object schemas have `.pick` and `.omit` methods that return a modified version.
   * Consider this Recipe schema:
   * @example
   * const Recipe = z.object({
   * id: z.string(),
   * name: z.string(),
   * ingredients: z.array(z.string()),
   * });
   * const JustTheNameAndId = Recipe.pick('name', 'id');
   * type JustTheName = z.infer<typeof JustTheNameAndId>;
   * // => { name: string, id: string }
   */
  pick<K extends keyof T, Keys extends K[] = K[]>(...keys: Keys): ObjectSchemaBuilder<Definition, Pick<T, Keys[number]>> {
    const picked: Record<string, any> = {}
    Object.entries(this.def).forEach(([k, def]) => {
      const finded = keys.find(key => key === k)
      if (finded) {
        picked[k] = def
      }
    })
    return new ObjectSchemaBuilder(picked) as never
  }
  /**
   * Inspired by TypeScript's built-in `Pick` and `Omit` utility types,
   * all object schemas have `.pick` and `.omit` methods that return a modified version.
   * Consider this Recipe schema:
   * @example
   * const Recipe = z.object({
   * id: z.string(),
   * name: z.string(),
   * ingredients: z.array(z.string()),
   * });
   * const JustTheName = Recipe.omit({ name: true });
   * type JustTheName = z.infer<typeof JustTheName>;
   * // => { id: string; ingredients: string[] }
   */
  omit<K extends keyof T, Keys extends K[] = K[]>(...keys: Keys): ObjectSchemaBuilder<Definition, Omit<T, Keys[number]>> {
    keys.forEach(k => {
      delete (this.def as any)[k]
    })
    return new ObjectSchemaBuilder(this.def) as never
  }

  /**
   * Use `.keyof` to create a `EnumSchema` from the keys of an object schema.
   * @example
   * const Dog = z.object({
   *   name: z.string(),
   *   age: z.number(),
   * });
   * const keySchema = Dog.keyof();
   * keySchema; // Enum<["name", "age"]>
   */
  keyof<Key extends string | number = Exclude<keyof Definition, symbol>>() {
    return makeEnum<Key, Key[], UnionToTuple<Key>>(Object.keys(this.def) as Key[])
  }
}
/**
 * Create `object` schema
 */
function object<
  Definitions extends ObjectDefinition,
>(def: Definitions) {
  return new ObjectSchemaBuilder<Definitions>(def)
}

class RecordSchemaBuilder<ValueDef extends AnySchemaBuilder = AnySchemaBuilder> extends SchemaBuilder<Record<string, Infer<ValueDef>>, ObjectSchema>{
  protected precheck(arg: unknown): arg is Record<string | number, Infer<ValueDef>> {
    if (typeof arg === 'object' && arg !== null) {
      return true;
    }
    if (this.isNullable && (arg === null || arg === undefined)) {
      return true;
    }
    return false
  }

  constructor(def: ValueDef) {
    super({
      type: 'object',
      additionalProperties: def.schema
    })
  }

}

/** 
 * Same as `object` but less strict for properties. 
 * 
 * Same as `object({}).passthrough()`
 * @see {@link object}
 */
function record<Def extends AnySchemaBuilder>(valueDef: Def) {
  return new RecordSchemaBuilder<Def>(valueDef)
}


class ArraySchemaBuilder<E = unknown, T extends E[] = E[]> extends SchemaBuilder<
  T,
  ArraySchema
> {
  protected precheck(arg: unknown): arg is T {
    if (Array.isArray(arg)) {
      return true
    } if ((arg === null || arg === undefined) && this.isNullable) {
      return true
    }
    return false
  }

  constructor(private definition: SchemaBuilder) {
    super({ type: 'array', items: [definition.schema], minItems: 0 })
  }

  get element() {
    return this.definition
  }
  /**
   * Must contain less items or equal than declared
   * @see {@link ArraySchemaBuilder.length}
   * @see {@link ArraySchemaBuilder.minLength}
   * @example
   * const arr = s.array(s.number()).maxLength(3)
   * arr.parse([1, 2, 3]) // OK
   * arr.parse([1]) // OK
   * arr.parse([1, 2, 3, 4]) // Error
   */
  maxLength<L extends number, Valid = IsPositiveInteger<L>>(
    value: Valid extends true
      ? L
      : [
        never,
        'Type Error. Only Positive and non floating numbers are supported.',
        `Received: '${L}'`,
      ],
  ) {
    this.schema.maxItems = value as L
    return this
  }
  /**
   * Must contain array length exactly. Same as `minLength(v)` and `maxLength(v)`
   * @see {@link ArraySchemaBuilder.maxLength}
   * @see {@link ArraySchemaBuilder.minLength}
   * @example
   * const arr = s.array(s.number()).length(5)
   * arr.parse([1, 2, 3, 4, 5]) // OK
   * arr.parse([1, 2, 3, 4, 5, 6]) // Error
   * arr.parse([1, 2, 3, 4]) // Error
   */
  length<L extends number, Valid = IsPositiveInteger<L>>(
    value: Valid extends true
      ? L
      : [
        never,
        'Type Error. Only Positive and non floating numbers are supported.',
        `Received: '${L}'`,
      ],
  ): ArraySchemaBuilder<any, CreateBetween<L, L, E>> {
    return this.minLength(value).maxLength(value) as never
  }
  /**
   * Must contain more items or equal than declared
   *
   * @see {@link ArraySchemaBuilder.length}
   * @see {@link ArraySchemaBuilder.maxLength}
   * @example
   * const arr = s.array(s.number()).minLength(3)
   * arr.parse([1, 2, 3]) // OK
   * arr.parse([1]) // Err
   * arr.parse([1, 2, 3, 4]) // OK
   */
  minLength<L extends number, Valid = IsPositiveInteger<L>>(
    value: Valid extends true
      ? L
      : [
        never,
        'Type Error. Only Positive and non floating numbers are supported.',
        `Received: '${L}'`,
      ],
  ) {
    if ((value as L) < 0) {
      throw new TypeError(`Only Positive and non floating numbers are supported.`)
    }
    this.schema.minItems = value as L
    return this
  }

  /**
   * same as `s.array().minLength(1)`
   * @see {@link ArraySchemaBuilder.minLength}
   */
  nonEmpty(): ArraySchemaBuilder<E, [E, ...E[]]> {
    return this.minLength(1) as never
  }

  /**
   * marks array for unique items
   */
  unique() {
    this.schema.uniqueItems = true
    return this
  }
  contains<S extends AnySchemaBuilder>(containItem: S) {
    this.schema.contains = containItem.schema
    return this
  }
  minContains(value: number) {
    this.schema.minContains = value;
    return this
  }
  maxContains(value: number) {
    this.schema.maxContains = value;
    return this
  }
}

function array<S extends SchemaBuilder = SchemaBuilder>(
  definition: S,
) {
  return new ArraySchemaBuilder<S['_output']>(definition)
}

type AssertArray<T> = T extends any[] ? T : never;
type TupleItems = [AnySchemaBuilder, ...AnySchemaBuilder[]]
type OutputTypeOfTuple<T extends TupleItems | []> = AssertArray<{
  [k in keyof T]: T[k] extends SchemaBuilder<any, any, any> ? T[k]["_output"] : never;
}>;

type OutputTypeOfTupleWithRest<
  T extends TupleItems | [],
  Rest extends SchemaBuilder | null = null
> = Rest extends SchemaBuilder
  ? [...OutputTypeOfTuple<T>, ...Infer<Rest>[]]
  : OutputTypeOfTuple<T>;

class TupleSchemaBuilder<
  Schemas extends TupleItems | [] = TupleItems,
> extends SchemaBuilder<OutputTypeOfTupleWithRest<Schemas>, ArraySchema> {
  protected precheck(arg: unknown): arg is any {
    if (Array.isArray(arg)) {
      return true
    } if ((arg === null || arg === undefined) && this.isNullable) {
      return true
    }
    return false
  }
  constructor(...defs: Schemas) {
    super({ type: 'array', items: defs.map(def => def.schema), additionalItems: false, minItems: 1 })
  }
  rest<Def extends SchemaBuilder>(def: Def): SchemaBuilder<OutputTypeOfTupleWithRest<Schemas>, ArraySchema, [...OutputTypeOfTupleWithRest<Schemas>, ...Infer<Def>[]]> {
    this.schema.items = def.schema
    return this as never
  }
}

/**
 * Similar to `array`, but it's tuple
 * @example
 * const athleteSchema = z.tuple([
 *  z.string(), // name
 *  z.number(), // jersey number
 *  z.object({
 *   pointsScored: z.number(),
 *  }), // statistics
 * ]);
 * type Athlete = z.infer<typeof athleteSchema>;
 * // type Athlete = [string, number, { pointsScored: number }]
 */
function tuple<Defs extends TupleItems | [] = TupleItems | []>(defs: Defs) {
  return new TupleSchemaBuilder(...defs)
}

class EnumSchemaBuilder<
  Enum extends EnumLike = EnumLike,
  Tuple extends Enum[keyof Enum][] = Enum[keyof Enum][],
> extends SchemaBuilder<Tuple, EnumAnnotation, Tuple[number]> {
  private _enum: Record<string, unknown> = {}

  readonly options = [] as unknown as Tuple

  protected precheck(arg: unknown): arg is Tuple {
    return true
  }

  constructor(values: Tuple) {
    // TODO: warning about tuple appears here in strict mode. Need to declare `type` field
    super({ enum: values as never })
    values.forEach((v: any) => {
      this._enum[v] = v
    })
    this.options = values
  }

  /**
   * returns enum as object representation
   */
  get enum(): Enum {
    return this._enum as never
  }
}
type EnumLike = { [k: string]: string | number;[nu: number]: string }

class NativeEnumSchemaBuilder<T extends EnumLike> extends SchemaBuilder<T, EnumAnnotation>{
  protected precheck(arg: unknown): arg is T {
    return true
  }
  get enum(): T {
    return this.enumValues
  }
  get options(): (keyof T)[] {
    return Object.values(this.enumValues)
  }
  constructor(private enumValues: T) {
    super({ enum: Object.values(enumValues) })
  }
}

/**
 * handle `enum` typescript type to make `enum` JSON annotation
 */
function makeEnum<E extends EnumLike = EnumLike>(enumLike: E): EnumSchemaBuilder<E, E[keyof E][]>
/**
 * handle tuple(array) of possible values to make `enum` JSON annotation
 */
function makeEnum<
  P extends string | number = string | number,
  T extends P[] | readonly P[] = [],
  U extends UnionToTuple<T[number]> = UnionToTuple<T[number]>,
>(possibleValues: T): EnumSchemaBuilder<{ [K in Extract<T[number], string>]: K }, Extract<T[number], string>[]>
function makeEnum(tupleOrEnum: unknown) {
  if (typeof tupleOrEnum === 'object' && tupleOrEnum !== null && !Array.isArray(tupleOrEnum)) {
    // enum
    return new NativeEnumSchemaBuilder(tupleOrEnum as never)
  } else if (Array.isArray(tupleOrEnum)) {
    // tuple
    return new EnumSchemaBuilder(tupleOrEnum)
  }
  throw new Error(`Cannot handle non tuple or non enum type.`, { cause: { type: typeof tupleOrEnum, value: tupleOrEnum } })
}

class ConstantSchemaBuilder<
  T extends number | string | boolean | null | object = never,
> extends SchemaBuilder<T, ConstantAnnotation> {
  protected precheck(arg: unknown): arg is T {
    // TODO: add check for object equantity, since {} === {} => false
    return this.schema.const === arg
  }

  constructor(readonly value: T) {
    super({ const: value })
  }
}

function constant<T extends number | string | boolean | null | object>(
  value: T,
) {
  return new ConstantSchemaBuilder<T>(value)
}

class UnionSchemaBuilder<
  S extends SchemaBuilder[] = SchemaBuilder[],
> extends SchemaBuilder<Infer<S[number]>, AnySchemaOrAnnotation> {
  protected precheck(arg: unknown): arg is Infer<S[number]> {
    // TODO: improve based on schema
    return true
  }

  constructor(...schemas: S) {
    super({
      anyOf: schemas.map((s) => s.schema),
    } as AnySchemaOrAnnotation)
  }
}
function or<S extends SchemaBuilder[] = SchemaBuilder[]>(
  schemaDefs: S
): SchemaBuilder<Infer<S[number]>, AnySchemaOrAnnotation> {
  return new UnionSchemaBuilder<S>(...schemaDefs)
}

class IntersectionSchemaBuilder<
  S extends SchemaBuilder[] = SchemaBuilder[],
> extends SchemaBuilder<
  Infer<S[number]>,
  AnySchemaOrAnnotation,
  UnionToIntersection<Infer<S[number]>>
> {
  protected precheck(arg: unknown): arg is Infer<S[number]> {
    // TODO improve based on schema
    return true
  }

  constructor(...schemas: S) {
    super({
      oneOf: schemas.map((s) => s.schema),
    } as AnySchemaOrAnnotation)
  }
}

function and<S extends SchemaBuilder[] = SchemaBuilder[]>(
  ...schemaDefs: S
) {
  return new IntersectionSchemaBuilder<S>(...schemaDefs)
}

class UnknownsSchemaBuilder<T extends unknown | any> extends SchemaBuilder<T, AnySchemaOrAnnotation>{
  protected precheck(arg: unknown): arg is T {
    return true
  }
  constructor() {
    super({} as AnySchemaOrAnnotation)
  }
}

/**
 * define all possible schema types for `anyOf` JSON schema
 */
function any() {
  return new UnknownsSchemaBuilder<any>()
}

/**
 * Same as {@link any} but for typescript better type quality
 */
function unknown() {
  return new UnknownsSchemaBuilder<unknown>()
}

function injectAjv<S extends SchemaBuilder = SchemaBuilder>(ajv: Ajv, schemaBuilderFn: (...args: any[]) => S): (...args: unknown[]) => S {
  return new Proxy(schemaBuilderFn, {
    apply(target, thisArg, argArray) {
      const result = Reflect.apply(target, thisArg, argArray)
      result.ajv = ajv
      return result
    },
  })
}

/**
 * Create new instance of schema with non default AJV instance
 */
function create(ajv: Ajv) {
  return {
    number: injectAjv(ajv, number) as typeof number,
    integer: injectAjv(ajv, integer) as typeof integer,
    int: injectAjv(ajv, integer) as typeof integer,
    string: injectAjv(ajv, string) as typeof string,
    null: injectAjv(ajv, nil) as typeof nil,
    enum: injectAjv(ajv, makeEnum) as typeof makeEnum,
    boolean: injectAjv(ajv, boolean) as typeof boolean,
    object: injectAjv(ajv, object) as typeof object,
    record: injectAjv(ajv, record) as typeof record,
    array: injectAjv(ajv, array) as typeof array,
    tuple: injectAjv(ajv, tuple) as typeof tuple,
    const: injectAjv(ajv, constant) as typeof constant,
    unknown: injectAjv(ajv, unknown) as typeof unknown,
    any: injectAjv(ajv, any) as typeof any,
    or: injectAjv(ajv, or) as typeof or,
    union: injectAjv(ajv, or) as typeof or,
    and: injectAjv(ajv, and) as typeof and,
    intersection: injectAjv(ajv, and) as typeof and,
  }
}

export {
  create,
  create as new,
  number,
  integer as int,
  integer,
  string,
  boolean,
  nil as null,
  object,
  record,
  array,
  tuple,
  constant as const,
  makeEnum as enum,
  and,
  and as intersection,
  or,
  or as union,
  unknown,
  any,
  type Infer as infer,
  type Input as input,
  type AnySchemaBuilder as AnySchema,
}

/**
 * Extract schema level defenition and return it's represenation as typescript type
 */
export type Infer<T extends SchemaBuilder<any, any, any>> = T['_output']
/** extract schema input type */
export type Input<T extends SchemaBuilder<any, any, any>> = T['_input']
