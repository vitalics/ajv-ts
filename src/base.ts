import Ajv from 'ajv'
import addFormats from 'ajv-formats'

import type { UnionToTuple, UnionToIntersection, RequiredByKeys, OptionalUndefined, IndexType } from './type-utils'
import type { BaseSchema, AnySchemaOrAnnotation, BooleanSchema, NumberSchema, ObjectSchema, StringSchema, ArraySchema, EnumAnnotation, NullSchema, ConstantAnnotation, AnySchema } from './types'

export const DEFAULT_AJV = addFormats(new Ajv())
type AnySchemaBuilder =
  | NumberSchemaBuilder
  | StringSchemaBuilder
  | BooleanSchemaBuilder
  | NullSchemaBuilder
  | ObjectSchemaBuilder
  | ArraySchemaBuilder
  | TupleSchemaBuilder
  | EnumSchemaBuilder
  | ConstantSchemaBuilder
  | UnionSchemaBuilder
  | IntersectionSchemaBuilder

function assertAjv(instance: unknown): asserts instance is Ajv {
  if (!(instance instanceof Ajv)) {
    throw new Error(`Cannot work for non Ajv class instance. Call "new Ajv()" or use default value.`)
  }
}


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
  preprocess<In = Input>(fn: (value: unknown) => In): SchemaBuilder<In, Schema, Output> {
    if (typeof fn !== 'function') {
      throw new TypeError(`Cannot use not a function for pre processing.`, { cause: { type: typeof fn, value: fn } })
    }
    this.preFns.push(fn)
    return this as never
  }

  private postFns: Function[] = []
  /**
   * Post process. Use it when you would like to transform result after parsing is happens
   */
  postprocess<Out = Output>(fn: (input: Input) => Out): SchemaBuilder<Input, Schema, Out> {
    if (typeof fn !== 'function') {
      throw new TypeError(`Cannot use not a function for pre processing.`, { cause: { type: typeof fn, value: fn } })
    }
    this.postFns.push(fn)
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

  default(value: Output) {
    (this.schema as AnySchema).default = value
    return this;
  }

  /**
   * Parse you input result. Used `ajv.validate` under the hood
   * 
   * It also allies your `postProcess` functions if parsing was successfull
   */
  safeParse(input: unknown): SafeParseResult<Output> {
    this.ajv.removeSchema(this.schema)
    let transformed;
    if (Array.isArray(this.preFns) && this.preFns.length > 0) {
      transformed = this.preFns.reduce((prevResult, fn) => {
        return fn(prevResult)
      }, input)
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
        const output = this.postFns.reduce((prevResult, fn) => {
          return fn(prevResult)
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

  int() {
    this.schema.type = 'integer'
    return this
  }

  format(type: 'int32' | 'double') {
    if (type !== 'double' && type !== 'int32') {
      throw new TypeError(
        `format supports only "int32" and "double" values. Received: "${type}"`,
      )
    }
    this.schema.format = type
    return this
  }

  get minValue() {
    // TODO: handle exclusiveMinimum as boolean
    return this.schema.minimum || this.schema.exclusiveMinimum as number || null
  }

  get maxValue() {
    // TODO: handle exclusiveMaximum as boolean
    return this.schema.maximum || this.schema.exclusiveMaximum as number || null
  }

  min(value: number, exclusive = false) {
    return this.minimum(value, exclusive)
  }
  minimum(value: number, exclusive = false) {
    if (exclusive) {
      this.schema.exclusiveMinimum = value
    } else {
      this.schema.minimum = value
    }
    return this
  }

  step(value: number) {
    return this.multipleOf(value)
  }

  /**
   * Numbers can be restricted to a multiple of a given number, using the `multipleOf` keyword.
   * It may be set to any positive number. Same as `step`.
   *
   * **NOTE**: Since JSON schema odes not allow to use `multipleOf` with negative value - we use `Math.abs` to transform negative values into positive
   * 
   * @see {@link NumberSchemaBuilder.step}
   */
  multipleOf(value: number) {
    this.schema.multipleOf = Math.abs(value)
    return this
  }

  max(value: number, exclusive = false) {
    return this.maximum(value, exclusive)
  }
  /**
   * marks you number maximum value
   */
  maximum(value: number, exclusive: boolean = false) {
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
   * @see {@link NumberSchemaBuilder.maximum}
   * @see {@link NumberSchemaBuilder.gt}
   */
  gte(value: number) {
    return this.minimum(value)
  }
  /**
   * Less than
   * @see {@link NumberSchemaBuilder.minimum}
   * @see {@link NumberSchemaBuilder.lte}
   */
  lt(value: number) {
    return this.max(value, true)
  }
  /**
   * Less than or Equal
   *
   * @see {@link NumberSchemaBuilder.minimum}
   * @see {@link NumberSchemaBuilder.lt}
   */
  lte(value: number) {
    return this.max(value)
  }
  positive() {
    return this.gt(0)
  }
  nonnegative() {
    return this.gte(0)
  }
  negative() {
    return this.lt(0)
  }
  nonpositive() {
    return this.lte(0)
  }
  safe() {
    return this.lte(Number.MAX_SAFE_INTEGER).gte(Number.MIN_SAFE_INTEGER)
  }
}
/**
 * Construct `number` schema
 */
function number() {
  return new NumberSchemaBuilder()
}
class StringSchemaBuilder extends SchemaBuilder<string, StringSchema, string> {
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

  pattern<Prefix extends string = string, Postfix extends string = string>(
    regex: RegExp | string,
  ): SchemaBuilder<string, StringSchema, `${Prefix}${Postfix}`> {
    if (typeof regex === 'string') {
      this.schema.pattern = `^${regex}$`
    } else {
      this.schema.pattern = `^${regex.source}$`
    }
    return this as SchemaBuilder<string, StringSchema, `${Prefix}${Postfix}`>
  }

  constructor() {
    super({ type: 'string' })
  }

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

  maxLength<L extends number, Valid = IsPositiveInteger<L>>(
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

  format(formatType: StringSchema['format']) {
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
  // eslint-disable-next-line class-methods-use-this
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
    this.nullable()
  }

  protected precheck(arg: unknown): arg is null {
    if ((arg === null || arg === undefined) && this.isNullable) {
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
> extends SchemaBuilder<T, ObjectSchema, OptionalUndefined<T>> {
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
  passthrough(): ObjectSchemaBuilder<IndexType<Definition>, IndexType<T>> {
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
  ): ObjectSchemaBuilder<Definition, RequiredByKeys<T, Key>> {
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
   * const JustTheName = Recipe.pick({ name: true });
   * type JustTheName = z.infer<typeof JustTheName>;
   * // => { name: string }
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
    super({ type: 'array', items: [definition.schema] })
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
  ) {
    this.schema.maxItems = value as L
    this.schema.minItems = value as L
    return this
  }
  /**
   * Must contain more items or equal than declared
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
    this.schema.minItems = 1
    return this as never
  }

  /**
   * marks array for unique items
   */
  unique() {
    this.schema.uniqueItems = true
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
    super({ type: 'array', prefixItems: defs.map(def => def.schema), items: false })
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

class UnknownsSchemaBuilder<T extends unknown | any = unknown> extends SchemaBuilder<T, AnySchemaOrAnnotation>{
  protected precheck(arg: unknown): arg is T {
    return true
  }
  constructor() {
    super({
      anyOf: [
        { type: 'array' },
        { type: 'boolean' },
        { type: 'integer' },
        { type: 'null' },
        { type: 'object' },
        { type: 'string' },
      ]
    } as AnySchemaOrAnnotation)
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
  return new UnknownsSchemaBuilder()
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
    string: injectAjv(ajv, string) as typeof string,
    null: injectAjv(ajv, nil) as typeof nil,
    enum: injectAjv(ajv, makeEnum) as typeof makeEnum,
    boolean: injectAjv(ajv, boolean) as typeof boolean,
    object: injectAjv(ajv, object) as typeof object,
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
  string,
  boolean,
  nil as null,
  object,
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
}

/**
 * Extract schema level defenition and return it's represenation as typescript type
 */
export type Infer<T extends SchemaBuilder<any, any, any>> = T['_output']
/** extract schema input type */
export type Input<T extends SchemaBuilder<any, any, any>> = T['_input']
