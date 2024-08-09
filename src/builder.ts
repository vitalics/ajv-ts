import Ajv from "ajv";
import ajvErrors from "ajv-errors";
import addFormats from "ajv-formats";

import type {
  AnySchema,
  AnySchemaOrAnnotation,
  ArraySchema,
  BaseSchema,
  BooleanSchema,
  ConstantAnnotation,
  EnumAnnotation,
  NullSchema,
  NumberSchema,
  ObjectSchema,
  StringSchema,
} from "./schema/types";
import { Create, MakeReadonly, Optional, Push } from "./types/array";
import type {
  Fn,
  Object as ObjectTypes,
  UnionToIntersection,
  UnionToTuple,
} from "./types/index";
import type { GreaterThan, GreaterThanOrEqual, IsPositiveInteger, LessThan } from "./types/number";
import type { OmitByValue, OmitMany, PickMany, Prettify } from "./types/object";
import type { Email, UUID } from "./types/string";
import type { TRangeGenericError, TTypeGenericError } from './types/errors';

/**
 * Default Ajv instance.
 *
 * @default
 * ajvErrors(addFormats(new Ajv({
 *  allErrors: true,
 *  useDefaults: true,
 * })))
 */
export const DEFAULT_AJV = ajvErrors(
  addFormats(
    new Ajv({
      allErrors: true,
      useDefaults: true,
    }) as Ajv,
  ) as Ajv,
);

/** Any schema builder. */
export type AnySchemaBuilder =
  | SchemaBuilder<any, any, any, any>
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
  | UnknownSchemaBuilder<unknown>
  | NotSchemaBuilder;

export type MetaObject = PickMany<
  BaseSchema,
  ["title", "description", "deprecated", "$id", "$async", "$ref", "$schema"]
>;

export type SafeParseResult<T> =
  | SafeParseSuccessResult<T>
  | SafeParseErrorResult<T>;

export type SafeParseSuccessResult<T> = {
  success: true;
  data: T;
  input: unknown;
  /** `undefined` for success result */
  error?: Error;
};
export type SafeParseErrorResult<T> = {
  success: false;
  error: Error;
  input: unknown;
  /** `undefined` for error result */
  data?: T;
};

export type ErrorMessageParams<T extends AnySchemaBuilder> = {
  /** Error message for not expected type. E.g. schema define string, but got number */
  type?: string;
  /** Error message for `required` property. E.g. schema define required property, but in actial result this property missing. */
  required?: T extends ObjectSchemaBuilder
  ? { [K in keyof Infer<T>]?: string } | string
  : string;
  /** Error message for properties. Mostly works for object, arrays */
  properties?: T extends ObjectSchemaBuilder
  ? { [K in keyof Infer<T>]?: string } | string
  : string;
  /** Error message for additional properties. Mostly works for object, arrays */
  additionalProperties?: string;
  /** Default or unmapped error message */
  _?: string;
};
export type SchemaBuilderOpts = {
  _preProcesses: Fn<any, any, any>[]
  _postProcesses: Fn<any, any, any>[]
}
export class SchemaBuilder<
  Input = unknown,
  Schema extends AnySchemaOrAnnotation = AnySchemaOrAnnotation,
  Output = Input,
  Opts extends SchemaBuilderOpts = { _preProcesses: [], _postProcesses: [] }
> {
  /**
   * type helper. Do Not Use!
   */
  _input!: Input;

  /**
   * type helper. Do Not Use!
   */
  _output!: Output;
  private _schema: Schema;
  private _shape: Schema;
  _preProcesses!: Opts['_preProcesses']
  _postProcesses!: Opts['_postProcesses']

  /**
   * returns JSON-schema representation
   */
  get schema() {
    return this._schema;
  }
  /**
   * returns JSON-schema representation. same as `schema` does.
   * @satisfies zod API
   */
  get shape() {
    return this._shape;
  }

  /**
   * Set custom JSON-Schema representation.
   * Updates `shape` property too
   */
  set schema(schema) {
    this._schema = schema;
    this._shape = schema;
  }

  /**
   * Set custom JSON-Schema representation.
   * Updates `schema` property too
   * @satisfies zod API
   */
  set shape(schema) {
    this._schema = schema;
    this._shape = schema;
  }

  /** Returns your ajv instance */
  get ajv() {
    return this._ajv;
  }

  /**
   * Set Ajv Instance.
   * @throws `TypeError` if not ajv instance comes
   */
  set ajv(instance: Ajv) {
    if (!(instance instanceof Ajv)) {
      throw new TypeError(`Cannot set ajv variable for non-ajv instance.`, {
        cause: { type: typeof instance, value: instance },
      });
    }
    this._ajv = instance;
  }

  constructor(
    schema: Schema,
    private _ajv = DEFAULT_AJV,
  ) {
    this._schema = schema;
    this._shape = schema;
  }
  protected isNullable = false;

  /**
   * set custom JSON-schema field. Useful if you need to declare something but no api founded for built-in solution.
   *
   * Example: `If-Then-Else` you cannot declare without `custom` method.
   * @example
   * const myObj = s.object({
   *  foo: s.string(),
   *  bar: s.string()
   * }).custom('if', {
   *  "properties": {
   *    "foo": { "const": "bar" }
   *  },
   *  "required": ["foo"]
   *  }).custom('then', { "required": ["bar"] })
   */
  custom<V = unknown, Result extends AnySchemaBuilder = this>(
    key: string,
    value: V,
  ): Result {
    (this.schema as Record<string, unknown>)[key] = value;
    return this as never;
  }

  /**
   * Marks your property as nullable (`undefined`)
   *
   * **NOTES**: json-schema not accept `undefined` type. It's just `nullable` as typescript `undefined` type.
   */
  optional(): SchemaBuilder<Input, Schema, Output | undefined> {
    return this.nullable() as never;
  }

  /**
   * Marks your property as nullable (`null`).
   *
   * Updates `type` property for your schema.
   * @example
   * const schemaDef = s.string().nullable()
   * schemaDef.schema // { type: ['string', 'null'], nullable: true }
   */
  nullable(): SchemaBuilder<Input, Schema, Output | null> {
    this.isNullable = true;
    (this.schema as any).nullable = true;
    const type = (this.schema as any).type;
    if (Array.isArray(type)) {
      (this.schema as any).type = [...new Set([...type, "null"])];
    } else {
      (this.schema as any).type = [...new Set([type, "null"])];
    }
    return this as never;
  }

  private preFns: Function[] = [];

  /**
   * pre process function for incoming result. Transform input **BEFORE** calling `parse`, `safeParse`, `validate` functions
   *
   * **NOTE:** this functions works BEFORE parsing. use it at own risk. (e.g. transform Date object into string)
   * @see {@link SchemaBuilder.parse parse} method
   * @see {@link SchemaBuilder.safeParse safe parse} method 
   * @see {@link SchemaBuilder.validate validate} method
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
  preprocess<
    const In,
    const Out,
    const F extends Fn<any, any>,
  >(fn: F): this {
    if (typeof fn !== "function") {
      throw new TypeError(`Cannot use not a function for pre processing.`, {
        cause: { type: typeof fn, value: fn },
      });
    }
    this.preFns.push(fn);
    return this as never;
  }

  private postFns: { fn: Function; schema: AnySchemaBuilder }[] = [];
  /**
   * Post process. Use it when you would like to transform result after parsing is happens.
   *
   * **NOTE:** this function override your `input` variable for `safeParse` calling.
   * @see {@link SchemaBuilder.safeParse safeParse method}
   */
  postprocess<const Out, S extends AnySchemaBuilder = AnySchemaBuilder>(
    fn: Fn<Out, [input: Output, schema: this]>,
    schema: S,
  ): this {
    if (typeof fn !== "function") {
      throw new TypeError(`Cannot use not a function for pre processing.`, {
        cause: { type: typeof fn, value: fn },
      });
    }
    this.postFns.push({ fn, schema });
    return this as never;
  }

  private refineFns: Function[] = [];
  /**
   * Set custom validation. Any result exept `undefined` will throws.
   * @param fn function that will be called after `safeParse`. Any result will throws
   * @example
   * import s from 'ajv-ts'
   * // example: object with only 1 "active element"
   * const Schema = s.object({
   * active: s.boolean(),
   * name: s.string()
   * }).array().refine((arr) => {
   *  const subArr = arr.filter(el => el.active === true)
   *  if (subArr.length > 1) throw new Error('Array should contains only 1 "active" element')
   * })
   *
   * Schema.parse([{ active: true, name: 'some 1' }, { active: true, name: 'some 2' }]) // throws Error
   */
  refine(fn: (output: Output) => any) {
    if (typeof fn !== "function") {
      throw new TypeError(
        `Cannot set for not a function for refine. Expect "function", Got: ${typeof fn}`,
        { cause: { fn, type: typeof fn } },
      );
    }
    this.refineFns.push(fn);
    return this;
  }

  /**
   * Meta object. Adds meta information fields in your schema, such as `deprecated`, `description`, `$id`, `title` and more!
   */
  meta(obj: MetaObject) {
    Object.entries(obj).forEach(([key, value]) => {
      this.custom(key, value);
    });
    return this;
  }

  /**
   * Option `default` keywords throws exception during schema compilation when used in:
   *
   * - not in `properties` or `items` subschemas
   * - in schemas inside `anyOf`, `oneOf` and `not` ({@link https://github.com/ajv-validator/ajv/issues/42 #42})
   * - in `if` schema
   * - in schemas generated by user-defined _macro_ keywords
   * This means only `object()` and `array()` buidlers are supported.
   * @see {@link object}
   * @see {@link array}
   * @example
   * import s from 'ajv-ts'
   * const Person = s.object({
   *   age: s.int().default(18)
   * })
   * Person.parse({}) // { age: 18 }
   */
  default(value: Output) {
    (this.schema as AnySchema).default = value;
    return this;
  }
  /**
   * Defines custom error message for invalid schema.
   *
   * Set `schema.errorMessage = message` under the hood.
   * @example
   * // number example
   * const numberSchema = s.number().error('Not a number')
   * numberSchema.parse('qwe') // error: Not a number
   */
  error(messageOrOptions: string | ErrorMessageParams<this>) {
    (this.schema as AnySchema).errorMessage = messageOrOptions;
    return this;
  }

  /**
   * set `description` for your schema.
   * You can use `meta` method to provide information in more consistant way.
   * @see {@link SchemaBuilder.meta meta} method
   * @satisfies `zod` API
   */
  describe(message: string) {
    return this.meta({ description: message });
  }

  /**
   * set `$async=true` for your current schema.
   *
   * @see {@link https://ajv.js.org/guide/async-validation.html ajv async validation}
   */
  async() {
    (this.schema as Record<string, unknown>).$async = true;
    return this;
  }

  /**
   * set `$async=false` for your current schema.
   * @param [remove=false] applies `delete` operator for `schema.$async` property.
   */
  sync(remove: boolean = false) {
    (this.schema as AnySchema).$async = false;
    if (remove) {
      delete (this.schema as AnySchema).$async;
    }
    return this;
  }

  /**
   * Construct Array schema. Same as `s.array(s.number())`
   *
   * @see {@link array}
   */
  array<El = Infer<this>>(): ArraySchemaBuilder<El, El[], this, { maxLength: undefined, minLength: undefined, prefix: [] }> {
    return array(this) as never;
  }

  /**
   * Same as `s.and()`. Combine current type with another. Logical "AND"
   *
   * Typescript `A & B`
   */
  intersection: typeof this.and = this.and;
  /**
   * Same as `s.and()`. Combine current type with another. Logical "AND"
   *
   * Typescript `A & B`
   */
  and<
    S extends AnySchemaBuilder[] = AnySchemaBuilder[],
    Arr extends AnySchemaBuilder[] = [this, ...S],
  // @ts-ignore - IntersectionSchemaBuilder circular return itself 2577
  >(...others: S): IntersectionSchemaBuilder<Arr> {
    return and(this, ...others) as never;
  }
  /**
   * Same as `s.or()`. Combine current type with another type. Logical "OR"
   *
   * Typescript: `A | B`
   */
  or<S extends AnySchemaBuilder[] = AnySchemaBuilder[]>(
    ...others: S
  ): UnionSchemaBuilder<[this, ...S]> {
    return or(this, ...others);
  }
  /**
   * Same as `s.or()`. Combine current type with another type. Logical "OR"
   *
   * Typescript: `A | B`
   */
  union: typeof this.or = this.or;

  /**
   * Exclude given subschema.
   *
   * Append `not` keyword for your schema
   *
   * @see {@link not}
   * @see {@link SchemaBuilder.not not method}
   * @example
   * cosnt res = s
   *   .string<'Jerry' | 'Martin'>()
   *   .exclude(s.const('Jerry'))
   *   .schema // {type: "string", not: {const: "Jerry"} }
   * type Res = s.infer<typeof res> // 'Martin'
   */
  exclude<
    S extends SchemaBuilder<any, any, any> = SchemaBuilder<any, any, any>,
    Excl = Exclude<this["_output"], S['_output']>,
    This = this extends StringSchemaBuilder<infer S>
    ? StringSchemaBuilder<Excl extends string ? Excl : S>
    : this extends NumberSchemaBuilder<infer N>
    ? NumberSchemaBuilder<Excl extends number ? Excl : N>
    : this extends BooleanSchemaBuilder<infer B>
    ? BooleanSchemaBuilder<Excl extends boolean ? Excl : B>
    : this extends ArraySchemaBuilder<infer E>
    ? ArraySchemaBuilder<Exclude<E, S["_output"]>>
    : this extends ObjectSchemaBuilder<
      infer Def extends ObjectDefinition
    >
    ? ObjectSchemaBuilder<OmitByValue<Def, S>>
    : this,
  >(s: S): This {
    (this.schema as AnySchema).not = s.schema;
    return this as never;
  }

  /**
   * Exclude self schema.
   *
   * Wrap your schema with `not` keyword
   *
   * `s.not(s.string())` === `s.string().not()`
   *
   * If you need to append `not` keyword instead of wrap you might need to use {@link SchemaBuilder.exclude `exclude`} method
   *
   * @see {@link not}
   * @see {@link SchemaBuilder.exclude exclude method}
   *
   * @example
   * // not string
   * s
   *   .string()
   *   .not()
   *   .schema //  {not: { type: "string" }},
   */
  not<S extends AnySchemaBuilder = this>(): NotSchemaBuilder<S> {
    return not(this) as never;
  }

  private _transform<Out = unknown>(
    input?: unknown,
    arr: ({ fn: Function; schema: AnySchemaBuilder } | Function)[] = [],
  ): SafeParseResult<Out> {
    let output;
    if (Array.isArray(arr) && arr.length > 0) {
      try {
        output = arr.reduce(
          (prevResult, el) => {
            if (!prevResult.success) {
              throw prevResult.error;
            }
            let fnTransform;
            let result: SafeParseResult<unknown> = {
              data: input,
              input,
              success: true,
            };
            if (typeof el === "function") {
              fnTransform = el(prevResult.data, this);
              result.data = fnTransform;
            } else {
              fnTransform = el.fn(prevResult.data, this);
              result = el.schema.safeParse(fnTransform);
            }
            return result;
          },
          { input, data: input, success: true } as SafeParseResult<unknown>,
        );
      } catch (e) {
        return {
          success: false,
          error: new Error((e as Error).message, { cause: e }),
          input,
        };
      }
      return output as SafeParseResult<Out>;
    }
    output = input;
    return { data: output as Out, input, success: true };
  }

  private _safeParseRaw(input?: unknown): SafeParseResult<unknown> {
    let success = false;
    try {
      const validateFn = this.ajv.compile(this.schema);
      success = validateFn(input);
      if (!success) {
        const firstError = validateFn.errors?.at(0);
        return {
          error: new Error(firstError?.message, {
            cause: validateFn.errors,
          }),
          success,
          input,
        };
      }
    } catch (e) {
      return {
        error: new Error((e as Error).message, { cause: e }),
        success: success as false,
        input,
      };
    }
    return {
      input,
      data: input,
      success,
    };
  }

  /**
   * Parse you input result. Used `ajv.validate` under the hood
   *
   * It also applies your `postProcess` functions if parsing was successfull
   */
  safeParse<const I>(input?: I): SafeParseResult<Output> {
    // need to remove schema, or we get precompiled result. It's bad for `extend` and `merge` in object schema
    // TODO: investigate merge and add in ajv
    // this.ajv.removeSchema(this.schema);
    let preTransformedResult = this._transform(input, this.preFns);
    preTransformedResult.input = input;
    if (!preTransformedResult.success) {
      return preTransformedResult as never;
    }

    const parseResult = this._safeParseRaw(preTransformedResult.data);
    parseResult.input = input;
    if (!parseResult.success) {
      return parseResult as never;
    }

    const postTransformedResult = this._transform<Output>(
      parseResult.data,
      this.postFns,
    );
    postTransformedResult.input = input;
    if (!postTransformedResult.success) {
      return postTransformedResult;
    }
    if (
      this.refineFns &&
      Array.isArray(this.refineFns) &&
      this.refineFns.length > 0
    ) {
      for (const refine of this.refineFns) {
        try {
          const res = refine(postTransformedResult.data);
          if (res !== undefined) {
            return {
              success: false,
              error: new Error(`refine error`, {
                cause: {
                  refine: res,
                  debug: {
                    input,
                    preTransformedResult,
                    parseResult,
                    postTransformedResult,
                  },
                },
              }),
              input: postTransformedResult.data,
            };
          }
        } catch (e) {
          return {
            success: false,
            error: e as Error,
            input: postTransformedResult.data,
          };
        }
      }
    }
    return postTransformedResult;
  }
  /**
   * Validate your schema.
   *
   * @returns {boolean} Validity of your schema
   */
  validate(input?: unknown): input is Output {
    const { success } = this.safeParse(input);
    return success;
  }

  /**
   * Parse input for given schema.
   *
   * @returns {Output} parsed output result.
   * @throws `Error` when input not match given schema
   */
  parse<
    const I,
  >(input?: I): Output {
    const result = this.safeParse(input);
    if (!result.success) {
      throw result.error;
    }
    return result.data as never;
  }
}

class NumberSchemaBuilder<
  const N extends number = number,
  Opts extends SchemaBuilderOpts = {
    _preProcesses: [],
    _postProcesses: [],
  }
> extends SchemaBuilder<number, NumberSchema, N> {
  constructor() {
    super({ type: "number" });
  }

  /**
   * change schema type from `any integer number` to `any number`.
   *
   * Set schema `{type: 'number'}`
   *
   * This is default behavior
   */
  number() {
    this.schema.type = "number";
    return this;
  }

  /**
   * The `const` keyword is used to restrict a value to a single value.
   * @example
   * const a = s.number().const(5)
   * a.schema // {type: "number", const: 5}
   * s.infer<typeof a> // 5
   */
  const<const N extends number>(value: N): NumberSchemaBuilder<N> {
    this.schema.const = value;
    return this as never;
  }

  /** Set schema `{type: 'integer'}` */
  integer() {
    this.schema.type = "integer";
    return this;
  }

  /**
   * Appends format for your number schema.
   */
  format(type: NumberSchema["format"]) {
    this.schema.format = type;
    return this;
  }

  /** Getter. Retuns `minimum` or `exclusiveMinimum` depends on your schema definition */
  get minValue() {
    return this.schema.minimum ?? (this.schema.exclusiveMinimum as number);
  }

  /** Getter. Retuns `maximum` or `exclusiveMaximum` depends on your schema definition */
  get maxValue() {
    return this.schema.maximum ?? (this.schema.exclusiveMaximum as number);
  }

  min = this.minimum;
  /**
   * Provides minimum value
   *
   * Set schema `minimum = value` (and add `exclusiveMinimum = true` if needed)
   * @example
   * s.number().min(2, true) // > 2
   * s.number().min(2) // >= 2
   */
  minimum(value: number, exclusive = false) {
    if (exclusive) {
      this.schema.exclusiveMinimum = value;
    } else {
      this.schema.minimum = value;
    }
    return this;
  }

  step = this.multipleOf;

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
    this.schema.multipleOf = Math.abs(value);
    return this;
  }

  max = this.maximum;
  /**
   * marks you number maximum value
   */
  maximum(value: number, exclusive = false) {
    if (exclusive) {
      this.schema.exclusiveMaximum = value;
    } else {
      this.schema.maximum = value;
    }
    return this;
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
    return this.minimum(value);
  }
  /**
   * Less than
   *
   * Range: `(value; Infinity)`
   * @see {@link NumberSchemaBuilder.minimum minimum}
   * @see {@link NumberSchemaBuilder.lte lte}
   */
  lt(value: number) {
    return this.max(value, true);
  }
  /**
   * Less than or Equal
   *
   * Range: `[value; Infinity)`
   * @see {@link NumberSchemaBuilder.minimum}
   * @see {@link NumberSchemaBuilder.lt}
   */
  lte(value: number) {
    return this.max(value);
  }
  /** Any positive number (greater than `0`)
   * Range: `(0; Infinity)`
   */
  positive() {
    return this.gt(0);
  }
  /** Any non negative number (greater than or equal `0`)
   *
   * Range: `[0; Inifnity)`
   */
  nonnegative() {
    return this.gte(0);
  }
  /** Any negative number (less than `0`)
   *
   * Range: `(Inifinity; 0)`
   */
  negative() {
    return this.lt(0);
  }
  /** Any non postive number (less than or equal `0`)
   *
   * Range: `(Inifinity; 0]`
   */
  nonpositive() {
    return this.lte(0);
  }
  /** Marks incoming number between `MAX_SAFE_INTEGER` and `MIN_SAFE_INTEGER` */
  safe() {
    return this.lte(Number.MAX_SAFE_INTEGER).gte(Number.MIN_SAFE_INTEGER);
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
function number<const N extends number = number>() {
  return new NumberSchemaBuilder<N>();
}

/**
 * construct `integer` schema.
 *
 * Same as `s.number().integer()`
 *
 * **NOTE:** By default Ajv fails `{"type": "integer"}` validation for `Infinity` and `NaN`.
 */
function integer() {
  return new NumberSchemaBuilder().integer();
}

export type StringBuilderOpts = {
  minLength?: number
  maxLength?: number,
}
class StringSchemaBuilder<
  const S extends string = string,
  Opts extends StringBuilderOpts & SchemaBuilderOpts = {
    minLength: undefined,
    maxLength: undefined,
    _preProcesses: [],
    _postProcesses: [],
  },
> extends SchemaBuilder<string, StringSchema, S, Opts> {
  /** DO not use. This is typescript type */
  _opts!: Opts
  /**
   * The `pattern` use regular expressions to express constraints.
   * The regular expression syntax used is from JavaScript ({@link https://www.ecma-international.org/publications-and-standards/standards/ecma-262/ ECMA 262}, specifically).
   * However, that complete syntax is not widely supported, therefore it is recommended that you stick to the subset of that syntax described below.
   *
   * - A single unicode character (other than the special characters below) matches itself.
   * - `.`: Matches any character except line break characters. (Be aware that what constitutes a line break character is somewhat dependent on your platform and language environment, but in practice this rarely matters).
   * - `^`: Matches only at the beginning of the string.
   * - `$`: Matches only at the end of the string.
   * - `(...)`: Group a series of regular expressions into a single regular expression.
   * - `|`: Matches either the regular expression preceding or following the | symbol.
   * - `[abc]`: Matches any of the characters inside the square brackets.
   * - `[a-z]`: Matches the range of characters.
   * - `[^abc]`: Matches any character not listed.
   * - `[^a-z]`: Matches any character outside of the range.
   * - `+`: Matches one or more repetitions of the preceding regular expression.
   * - `*`: Matches zero or more repetitions of the preceding regular expression.
   * - `?`: Matches zero or one repetitions of the preceding regular expression.
   * - `+?`, `*?`, `??`: The *, +, and ? qualifiers are all greedy; they match as much text as possible. Sometimes this behavior isn't desired and you want to match as few characters as possible.
   * - `(?!x)`, `(?=x)`: Negative and positive lookahead.
   * - `{x}`: Match exactly x occurrences of the preceding regular expression.
   * - `{x,y}`: Match at least x and at most y occurrences of the preceding regular expression.
   * - `{x,}`: Match x occurrences or more of the preceding regular expression.
   * - `{x}?`, `{x,y}?`, `{x,}?`: Lazy versions of the above expressions.
   * @example
   * const phoneNumber = s.string().pattern("^(\\([0-9]{3}\\))?[0-9]{3}-[0-9]{4}$")
   *
   * phoneNumber.parse("555-1212") // OK
   * phoneNumber.parse("(888)555-1212") // OK
   * phoneNumber.parse("(888)555-1212 ext. 532") // Error
   * phoneNumber.parse("(800)FLOWERS") // Error
   * // typescript custom type
   * const prefixS = s.string().pattern<`S_${string}`>("^S_$")
   * type S = s.infer<typeof prefixS> // `S_${string}`
   * const str1 = prefixS.parse("qwe") // Error
   * const str2 = prefixS.parse("S_Some") // OK
   */
  pattern<Pattern extends string = string>(
    pattern: string,
  ): StringSchemaBuilder<Pattern, Opts> {
    this.schema.pattern = pattern;
    return this as never;
  }

  constructor() {
    super({ type: "string" });
  }

  const<V extends string>(value: V): StringSchemaBuilder<V, Opts> {
    this.schema.const = value;
    return this as never;
  }

  /**
   * Define minimum string length.
   *
   * Same as `min`
   * @see {@link StringSchemaBuilder.min min}
   */
  minLength<
    const L extends number,
    Valid = IsPositiveInteger<L>,
    MinLengthValid extends boolean = GreaterThan<L, Opts['maxLength'] extends number ? Opts['maxLength'] : number>
  >(
    value: Valid extends true
      ? MinLengthValid extends true
      ? L
      : TRangeGenericError<`MinLength are greater than MaxLength. MinLength: ${L}. MaxLength: ${Opts['maxLength']}`>
      : TTypeGenericError<
        `Only Positive and non floating numbers are supported. Received: '${L}'`
      >
  ): StringSchemaBuilder<S, { minLength: L, maxLength: Opts['maxLength'], _preProcesses: Opts['_preProcesses'], _postProcesses: Opts['_postProcesses'] }> {
    this.schema.minLength = value as L;
    return this as never;
  }
  /**
   * Define minimum string length.
   *
   * Same as `minLength`
   * @see {@link StringSchemaBuilder.minLength minLength}
   */
  min = this.minLength;

  /**
   * Define maximum string length.
   *
   * Same as `max`
   * @see {@link StringSchemaBuilder.max max}
   */
  maxLength<
    const L extends number,
    Valid = IsPositiveInteger<L>,
    MinLengthValid = LessThan<Opts['minLength'] extends number ? Opts['minLength'] : number, L>>(
      value: Valid extends true
        ? MinLengthValid extends true ? L
        : TRangeGenericError<`MinLength are greater than MaxLength. MinLength: ${Opts['minLength']}. MaxLength: ${L}`>
        : TTypeGenericError<`Expected positive integer. Received: '${L}'`>,
    ): StringSchemaBuilder<S, { maxLength: L, minLength: Opts['minLength'], _preProcesses: Opts['_preProcesses'], _postProcesses: Opts['_postProcesses'] }> {
    this.schema.maxLength = value as L;
    return this as never;
  }
  /**
   * Define maximum string length.
   *
   * Same as `maxLength`
   * @see {@link StringSchemaBuilder.maxLength maxLength}
   */
  max = this.maxLength;

  /**
   * Define exact string length
   *
   * Same as `s.string().min(v).max(v)`
   *
   * @see {@link StringSchemaBuilder.minLength minLength}
   * @see {@link StringSchemaBuilder.maxLength maxLength}
   * @example
   * const exactStr = s.string().length(3)
   * exactStr.parse('qwe') //Ok
   * exactStr.parse('qwer') // Error
   * exactStr.parse('go') // Error
   */
  length<
    const L extends number,
    Valid = IsPositiveInteger<L>>(
      value: Valid extends true
        ? L
        : TTypeGenericError<
          `Expected positive integer. Received: '${L}'`
        >,
    ): StringSchemaBuilder<S, { minLength: L, maxLength: L, _postProcesses: Opts['_postProcesses'], _preProcesses: Opts['_preProcesses'] }> {
    return this.maxLength(value as never).minLength(value as never) as never;
  }
  /**
   * Define non empty string. Same as `minLength(1)`
   */
  nonEmpty(): StringSchemaBuilder<S, { minLength: 1, maxLength: Opts['maxLength'], _preProcesses: Opts['_preProcesses'], _postProcesses: Opts['_postProcesses'] }> {
    return this.minLength(1 as never);
  }

  /**
   * A string is valid against this format if it represents a valid e-mail address format.
   *
   * Example: `some@gmail.com`
   */
  email(): OmitMany<
    StringSchemaBuilder<Email>,
    [
      "format",
      "ipv4",
      "ipv6",
      "time",
      "date",
      "dateTime",
      "regex",
      "uuid",
      "email",
    ]
  > {
    return this.format("email") as never;
  }
  ipv4() {
    return this.format("ipv4");
  }
  ipv6() {
    return this.format("ipv6");
  }
  /**
   * A Universally Unique Identifier as defined by {@link https://datatracker.ietf.org/doc/html/rfc4122 RFC 4122}.
   *
   * Same as `s.string().format('uuid')`
   *
   * Example: `3e4666bf-d5e5-4aa7-b8ce-cefe41c7568a`
   */
  uuid(): OmitMany<
    StringSchemaBuilder<UUID>,
    [
      "format",
      "ipv4",
      "ipv6",
      "time",
      "date",
      "dateTime",
      "regex",
      "uuid",
      "email",
    ]
  > {
    return this.format("uuid") as never;
  }
  /**
   * A string is valid against this format if it represents a time in the following format: `hh:mm:ss.sTZD`.
   *
   * Same as `s.string().format('time')`
   *
   * Example: `20:20:39+00:00`
   */
  time() {
    return this.format("time");
  }
  /**
   * A string is valid against this format if it represents a date in the following format: `YYYY-MM-DD`.
   *
   * Same as `s.string().format('date')`
   *
   * Example: `2023-10-10`
   */
  date() {
    return this.format("date");
  }

  /**
   * A string is valid against this format if it represents a date-time in the following format: `YYYY:MM::DDThh:mm:ss.sTZD`.
   *
   * Same as `s.string().format('date-time')`
   *
   * Example: `2023-10-05T05:49:37.757Z`
   */
  dateTime() {
    return this.format("date-time");
  }

  /**
   * A string is valid against this format if it represents a valid regular expression.
   *
   * Same as `s.string().format('regex')`
   */
  regex() {
    return this.format("regex");
  }

  format(formatType: StringSchema["format"]): this {
    this.schema.format = formatType;
    return this;
  }
  // override parse<
  //   const I extends string,
  //   Matches = I extends S ? true : false,
  //   ValidMinLength = GreaterThanOrEqual<StringLength<I>, Opts['minLength'] extends number ? Opts['minLength'] : number>
  // >(input?: Matches extends true ?
  //   ValidMinLength extends true
  //   ? I
  //   : TRangeGenericError<`Incoming parameter not matches MinLength requirement. Got '${I}'. MinLength: ${Opts['minLength']}`>
  //   : TTypeGenericError<`Incoming type '${I}' not mathes to expected '${S}'`>
  // ): S {
  //   return super.parse(input) as never
  // }
}

/**
 * Construct `string` schema
 */
function string<const S extends string = string>() {
  return new StringSchemaBuilder<S>();
}

class BooleanSchemaBuilder<
  const B extends boolean = boolean,
> extends SchemaBuilder<B, BooleanSchema> {
  constructor() {
    super({ type: "boolean" });
  }
}
/**
 * Construct `boolean` schema
 */
function boolean() {
  return new BooleanSchemaBuilder();
}

class NullSchemaBuilder extends SchemaBuilder<null, NullSchema> {
  constructor() {
    super({ type: "null" });
  }
}
function nil() {
  return new NullSchemaBuilder();
}

export type ObjectDefinition = { [key: string]: SchemaBuilder };
type Merge<F, S> = Omit<F, keyof S> & S;
class ObjectSchemaBuilder<
  Definition extends ObjectDefinition = ObjectDefinition,
  T = { [K in keyof Definition]: Infer<Definition[K]> },
  Out = ObjectTypes.OptionalUndefined<T>,
> extends SchemaBuilder<T, ObjectSchema, Out> {
  protected def: Definition = {} as Definition;
  constructor(def?: Definition) {
    super({
      type: "object",
      properties: {},
    });
    if (def) {
      Object.entries(def).forEach(([key, d]) => {
        this.schema.properties![key] = d.schema;
      });
      this.def = def;
    }
  }

  /**
   * set `additionalProperties=true` for your JSON-schema.
   *
   * Opposite of `strict`
   * @see {@link ObjectSchemaBuilder.strict strict}
   */
  passthrough(): ObjectSchemaBuilder<
    Definition,
    T & ObjectTypes.IndexType<T>,
    ObjectTypes.IndexType<T>
  > {
    this.schema.additionalProperties = true;
    return this as never;
  }
  /**
   * Makes all properties partial(not required)
   */
  partial(): ObjectSchemaBuilder<
    Definition,
    Partial<T>,
    ObjectTypes.OptionalUndefined<Partial<T>>
  > {
    this.schema.required = [];
    return this as never;
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
    const required = this.schema.required ?? ([] as string[]);
    const findedIndex = required.indexOf(key as string);
    // remove element from array. e.g. "email" for ['name', 'email'] => ['name']
    // opposite of push
    if (findedIndex !== -1) {
      (this.schema.required as string[]).splice(findedIndex, 1);
    }
    return this as never;
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
  dependentRequired<Deps = { [K in keyof T]?: Exclude<keyof T, K>[] }>(
    dependencies: Deps,
  ): ObjectSchemaBuilder<
    Definition,
    ObjectTypes.OptionalByKey<
      T,
      ObjectTypes.InferKeys<Deps> extends keyof T
      ? ObjectTypes.InferKeys<Deps>
      : keyof T
    >
  > {
    this.schema.dependentRequired = dependencies as never;
    return this as never;
  }

  /**
   * Disallow additional properties for object schema `additionalProperties=false`
   *
   * If you would like to define additional properties type - use `additionalProeprties`
   * @see {@link ObjectSchemaBuilder.additionalProperties additionalProperties}
   */
  strict() {
    this.schema.additionalProperties = false;
    return this;
  }

  /**
   * Makes 1 property required, other keys are not required.
   *
   * If some properties is already marked with `requiredFor` - we append new key into `required` JSON schema
   */
  requiredFor<Key extends keyof T = keyof T>(
    ...keys: Key[]
  ): ObjectSchemaBuilder<
    Definition,
    ObjectTypes.RequiredByKeys<T, (typeof keys)[number]>
  > {
    this.schema.required = [
      ...new Set([...(this.schema.required ?? []), ...(keys as string[])]),
    ];
    return this as never;
  }

  /**
   * Make **ALL** properties in your object required.
   *
   * If you need to make 1 property required - use {@link ObjectSchemaBuilder.requiredFor}
   */
  required(): ObjectSchemaBuilder<Definition, Required<T>> {
    const allProperties = Object.keys(this.schema.properties!);
    // keep unique only
    this.schema.required = [
      ...new Set([...(this.schema.required ?? []), ...allProperties]),
    ];
    return this as never;
  }

  /**
   * Define schema for additional properties
   *
   * If you need to make `additionalProperties=false` use `strict` method instead
   *
   * @see {@link ObjectSchemaBuilder.strict strict}
   */
  rest<S extends AnySchemaBuilder>(
    def: S,
  ): ObjectSchemaBuilder<
    Definition & S,
    T & { [K in string]: Infer<S> },
    T & { [K in string]: Infer<S> }
  > {
    this.schema.additionalProperties = def.schema;
    return this as never;
  }

  /**
   * Merge current object with another object definition
   * @example
   * const a = s.object({num: s.number()})
   * const b = s.object({str: s.string()})
   * const c = a.merge(b)
   * type C = s.infer<typeof c> // {num: number; str: string}
   */
  merge<
    Def extends ObjectDefinition = ObjectDefinition,
    ObjSchema extends ObjectSchemaBuilder<Def> = ObjectSchemaBuilder<Def>,
  >(
    schema: ObjSchema,
  ): ObjectSchemaBuilder<
    Merge<Definition, Def>,
    Merge<this["_output"], ObjSchema["_output"]>
  > {
    if (schema.schema.type !== 'object') {
      throw new TypeError('Cannot merge not object type with object', {
        cause: {
          incoming: schema.schema,
          given: this.schema,
        },
      })
    }
    const a = object();
    a.schema = Object.assign({}, this.schema);
    Object.entries(schema.def).forEach(([key, def]) => {
      a.schema.properties![key] = def.schema;
    });
    a.def = { ...this.def, ...schema.def }
    return a as never;
  }
  /**
   * Same as `merge`, but not accepts `s.object`.
   * @example
   * const a = s.object({num: s.number()})
   * const c = a.extend({str: s.string()})
   * type C = s.infer<typeof c> // {num: number; str: string}
   */
  extend<ObjDef extends ObjectDefinition = ObjectDefinition>(
    def: ObjDef,
  ): ObjectSchemaBuilder<Merge<Definition, ObjDef>> {
    const a = object();
    a.schema = Object.assign({}, this.schema);
    Object.entries(def).forEach(([key, def]) => {
      a.schema.properties![key] = def.schema;
    });
    a.def = { ...this.def, ...def }
    return a as never;
  }

  /**
   * Mark object as `readOnly`. It mostly decoration for typescript.
   * 
   * Set `schema.readOnly=true`.
   * @see {@link https://json-schema.org/draft-07/json-schema-validation#rfc.section.10.3 JSON-schema - readOnly keyword}
   */
  readonly(): ObjectSchemaBuilder<Definition, Readonly<T>> {
    this.schema.readOnly = true;
    return this as never;
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
   * type JustTheName = s.infer<typeof JustTheNameAndId>;
   * // => { name: string, id: string }
   */
  pick<K extends keyof T, Keys extends K[] = K[]>(
    ...keys: Keys
  ): ObjectSchemaBuilder<Definition, Pick<T, Keys[number]>> {
    const picked: Record<string, any> = {};
    Object.entries(this.def).forEach(([k, def]) => {
      const finded = keys.find((key) => key === k);
      if (finded) {
        picked[k] = def;
      }
    });
    return new ObjectSchemaBuilder(picked) as never;
  }
  /**
   * Inspired by TypeScript's built-in `Pick` and `Omit` utility types,
   * all object schemas have `.pick` and `.omit` methods that return a modified version.
   * Consider this Recipe schema:
   * @example
   * const Recipe = s.object({
   * id: s.string(),
   * name: s.string(),
   * ingredients: s.array(s.string()),
   * });
   * const JustTheName = Recipe.omit('name');
   * type JustTheName = s.infer<typeof JustTheName>;
   * // => { id: string; ingredients: string[] }
   */
  omit<K extends keyof T, Keys extends K[] = K[]>(
    ...keys: Keys
  ): ObjectSchemaBuilder<Definition, Omit<T, Keys[number]>> {
    keys.forEach((k) => {
      delete (this.def as any)[k];
    });
    return new ObjectSchemaBuilder(this.def) as never;
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
    return makeEnum<Key, Key[], UnionToTuple<Key>>(
      Object.keys(this.def) as Key[],
    );
  }
}
/**
 * Create `object` schema.
 *
 * JSON schema: `{type: 'object', properties: {}}`
 *
 * You can pass you object type to get typescript validation
 * @example
 * import s from 'ajv-ts'
 * type User = {
 *   name: string;
 *   age: number;
 * };
 * const UserSchema = s.object<User>({}) // typescript error: expect type User, got {}
 */
function object<
  ObjType extends {
    [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | readonly unknown[]
    | object;
  } = {},
  Definitions extends ObjectDefinition = {
    [K in keyof ObjType]: MatchTypeToBuilder<ObjType[K]> extends SchemaBuilder ? MatchTypeToBuilder<ObjType[K]> : never;
  },
>(def?: Definitions) {
  return new ObjectSchemaBuilder<Definitions>(def);
}

class RecordSchemaBuilder<
  ValueDef extends AnySchemaBuilder = AnySchemaBuilder,
> extends SchemaBuilder<Record<string, Infer<ValueDef>>, ObjectSchema> {
  constructor(def?: ValueDef) {
    super({
      type: "object",
      additionalProperties: {} as AnySchemaOrAnnotation,
    });
    if (def) {
      this.schema.additionalProperties = def.schema;
    }
  }
}

/**
 * Same as `object` but less strict for properties.
 *
 * Same as `object().passthrough()`
 * @see {@link object}
 */
function record<Def extends AnySchemaBuilder>(valueDef?: Def) {
  return new RecordSchemaBuilder<Def>(valueDef);
}

export type ArrayShemaOpts = {
  minLength?: number,
  maxLength?: number,
  prefix?: any[],
}
type GetArrayOrEmpty<T> = T extends readonly unknown[] ? T : []
class ArraySchemaBuilder<
  El = undefined,
  Arr extends readonly unknown[] = El[],
  S extends AnySchemaBuilder = SchemaBuilder<El, any, El>,
  Opts extends ArrayShemaOpts = { prefix: [], minLength: undefined, maxLength: undefined }
> extends SchemaBuilder<Arr, ArraySchema, [...GetArrayOrEmpty<Opts['prefix']>, ...Arr]> {
  constructor(definition?: S) {
    super({ type: "array", items: definition?.schema ?? {}, minItems: 0 });
  }

  /**
   * Make your array `readonly`.
   *
   * Set in JSON schema `unevaluatedItems=false`.
   */
  readonly(): ArraySchemaBuilder<El, MakeReadonly<Arr>, S, Opts> {
    this.schema.unevaluatedItems = false;
    return this;
  }

  /**
   * set `prefixItems` in your schema.
   *
   * For better DX - we mark main element schema as `element`.
   */
  prefix<Pref extends AnySchemaBuilder[]>(
    ...definitions: Pref
  ): ArraySchemaBuilder<El, [element: El], S, {
    prefix: InferArray<Pref>,
    maxLength: Opts['maxLength'],
    minLength: Opts['minLength']
  }> {
    this.schema.prefixItems = definitions.map((def) => def.schema);
    return this as never;
  }

  /**
   * Append subschema for current array schema.
   *
   * If your schema contains 1 element - this method will transform to array.
   *
   * **NOTE:** if your schema defined with `items: false` - `boolean` value will be replaced to incoming schema.
   *
   * @example
   * import s from 'ajv-ts'
   * const arr = s
   *   .array(s.string()) // schema = { type: 'array', items: {type: 'string'} }
   *   .addItems(s.number(), s.boolean())
   * arr.schema // {type: 'array', items: [{type: 'string'}, {type: 'number'}, {type: 'boolean'}] }
   */
  addItems<
    Schema extends AnySchemaBuilder,
    Schemas extends SchemaBuilder[] = Schema[],
  >(
    ...s: Schemas
  ): ArraySchemaBuilder<
    El | Infer<Schema>,
    [...Arr, ...InferArray<Schemas>],
    S,
    Opts
  > {
    if (Array.isArray(this.schema.items)) {
      this.schema.items.push(...s.map((el) => el.schema));
    } else if (typeof this.schema.items === "object") {
      const prev = this.schema.items;
      const isEmptyObject =
        Object.keys(prev).length === 0 && prev.constructor === Object;
      if (isEmptyObject) {
        this.schema.items = s.map((el) => el.schema);
      } else {
        this.schema.items = [prev, ...s.map((el) => el.schema)];
      }
    } else {
      this.schema.items = s.map((el) => el.schema);
    }
    return this as never;
  }

  max = this.maxLength;
  /**
   * Must contain less items or equal than declared
   * @see {@link ArraySchemaBuilder.length length}
   * @see {@link ArraySchemaBuilder.minLength minLength}
   * @example
   * const arr = s.array(s.number()).maxLength(3)
   * arr.parse([1, 2, 3]) // OK
   * arr.parse([1]) // OK
   * arr.parse([1, 2, 3, 4]) // Error
   */
  maxLength<
    const L extends number,
    Valid = IsPositiveInteger<L>,
    IsValidByMaxLength = Opts['minLength'] extends number ? GreaterThan<L, Opts['minLength']> : true
  >(
    value: Valid extends false ? TTypeGenericError<`Only Positive and non floating numbers are supported. Received: '${L}'`>
      : IsValidByMaxLength extends false ? TRangeGenericError<'MaxLength less than MinLength', [
        `MinLength: ${Opts['minLength']}`,
        `MaxLength: ${L}`
      ]>
      : L,
  ): ArraySchemaBuilder<El, Optional<Create<L, El>>, S, { maxLength: L, minLength: Opts['minLength'], prefix: Opts['prefix'] }> {
    this.schema.maxItems = value as L;
    return this as never;
  }
  /**
 * Must contain more items or equal than declared
 *
 * @see {@link ArraySchemaBuilder.length length}
 * @see {@link ArraySchemaBuilder.maxLength maxLength}
 * @example
 * const arr = s.array(s.number()).minLength(3)
 * arr.parse([1, 2, 3]) // OK
 * arr.parse([1]) // Error
 * arr.parse([1, 2, 3, 4]) // OK
 */
  minLength<
    const L extends number,
    IsValidByMaxLength = Opts['maxLength'] extends undefined ? true : Opts['maxLength'] extends number ? LessThan<L, Opts['maxLength']> : true,
  >(
    value: IsPositiveInteger<L> extends false ? TTypeGenericError<
      `MinLength should be positive integer. Received: '${L}'`, [L]
    > : IsValidByMaxLength extends false ? TRangeGenericError<
      `MaxLength is less than minLength.`,
      [
        `MinLength: ${L}`,
        `MaxLength: ${Opts['maxLength']}`
      ]> : L,
  ): ArraySchemaBuilder<El, [...Create<L, El>, ...El[]], S, { maxLength: Opts['maxLength'], minLength: L, prefix: Opts['prefix'] }> {
    if ((value as never) < 0) {
      throw new TypeError(
        `Only Positive and non floating numbers are supported.`,
      );
    }

    this.schema.minItems = value as L;
    return this as never;
  }
  min = this.minLength;

  /**
   * Returns schema builder of the element.
   *
   * If element is an array - returns `ArraySchemaBuilder` instance
   *
   * @example
   * import s from 'ajv-ts'
   * const strArr = s.array(s.string())
   * const str = strArr.element // isntance of StringSchemaBuilder
   * s.parse('qwe') // ok, string schema
   * s.schema // {type: 'string'}
   */
  get element(): El extends Array<unknown>
    ? ArraySchemaBuilder<El[number], El>
    : El extends
    | string
    | number
    | boolean
    | object
    | unknown[]
    | null
    | undefined
    ? MatchTypeToBuilder<El>
    : SchemaBuilder<El> {
    const elementSchema = this.schema.items;
    if (Array.isArray(elementSchema)) {
      const builder = array<SchemaBuilder<Arr[number]>>();
      builder.schema = { type: "array", items: elementSchema };
      return builder as never;
    } else {
      const builder = any();
      builder.schema = elementSchema;
      return builder as never;
    }
  }
  /**
   * Must contain array length exactly. Same as `minLength(v).maxLength(v)`
   * @see {@link ArraySchemaBuilder.maxLength}
   * @see {@link ArraySchemaBuilder.minLength}
   * @example
   * const arr = s.array(s.number()).length(5)
   * arr.parse([1, 2, 3, 4, 5]) // OK
   * arr.parse([1, 2, 3, 4, 5, 6]) // Error
   * arr.parse([1, 2, 3, 4]) // Error
   */
  length<L extends number,
    Valid = IsPositiveInteger<L>,
    OkMinLength = Opts['minLength'] extends undefined ? true : false,
    OkMaxLength = Opts['maxLength'] extends undefined ? true : false,
  >(
    value: OkMaxLength extends true ?
      OkMinLength extends true ?
      Valid extends true
      ? L
      : TTypeGenericError<
        `expected positive integer. Received: '${L}'`
      >
      : TRangeGenericError<`MinLength not equal to Length. MinLength: ${Opts['minLength']}. Length: ${L}`>
      : TRangeGenericError<`MaxLength not equal to Length. MaxLength: ${Opts['maxLength']}. Length: ${L}`>,
  ): ArraySchemaBuilder<El, Create<L, El>, S, Pick<Opts, 'prefix'> & { minLength: L, maxLength: L }> {
    return this.minLength(value as never).maxLength(value as never) as never;
  }

  /**
   * same as `s.array().minLength(1)`
   * @see {@link ArraySchemaBuilder.minLength}
   */
  nonEmpty<
    // `HasLength` shows is Arr['length'] returns number or not
    // Example: Input: string[], HasLength<number, number> = false
    // Example: Input: [string, string], HasLength<2, number> = true
    HasLength = GreaterThan<Arr["length"], number>,
  >(): ArraySchemaBuilder<
    El,
    HasLength extends true ? Arr : [El, ...El[]],
    S,
    { prefix: Opts['prefix'], minLength: 1, maxLength: Opts['maxLength'] }
  > {
    return this.minLength(1 as never) as never;
  }

  /**
   * Set the `uniqueItems` keyword to `true`.
   * @example
   * const items = s.array(s.number()).unique()
   *
   * items.parse([1, 2, 3, 4, 5]) // OK
   * items.parse([1, 2, 3, 3, 3]) // Error: items are not unique
   */
  unique() {
    this.schema.uniqueItems = true;
    return this;
  }

  /**
   * `contains` schema only needs to validate against one or more items in the array.
   *
   * JSON Schema: `{type: 'array', contains: <json-schema>}`
   * @example
   * const arr = s.array().contains(s.number())
   * arr.validate([]) // false, no numbers here
   * arr.validate([true, 1, 'str']) // true
   */
  contains<S extends AnySchemaBuilder>(containItem: S) {
    this.schema.contains = containItem.schema;
    return this;
  }
  /**
   * ## draft 2019-09
   * `minContains` and `maxContains` can be used with contains to further specify how many times a schema matches a
   * `contains` constraint. These keywords can be any non-negative number including zero.
   * @example
   * const schema = s.array(s.string()).contains(s.number()).minContains(3)
   * schema.parse(['qwe', 1,2,3]) // OK
   * schema.parse(['qwe', 1,2]) // Error, expect at least 3 numerics
   */
  minContains<const N extends number = number, Valid = IsPositiveInteger<N>>(
    value: Valid extends true
      ? N
      : [
        never,
        'TypeError: "minContains" should be positive integer',
        `Received: '${N}'`,
      ],
  ) {
    this.schema.minContains = value as N;
    return this;
  }
  /**
   * ## draft 2019-09
   * `minContains` and `maxContains` can be used with contains to further specify how many times a schema matches a
   * `contains` constraint. These keywords can be any non-negative number including zero.
   * @example
   * const schema = s.array(s.string()).contains(s.number()).maxContains(3)
   * schema.parse(['qwe', 1,2,3]) // OK
   * schema.parse(['qwe', 1,2,3, 4]) // Error, expect max 3 numbers
   */
  maxContains<const N extends number = number, Valid = IsPositiveInteger<N>>(
    value: Valid extends true
      ? N
      : [
        never,
        'TypeError: "maxContains" should be positive integer',
        `Received: '${N}'`,
      ],
  ) {
    this.schema.maxContains = value as N;
    return this;
  }
}

/**
 * Define schema for array of elements. Accept array of subschemas.
 * @example
 * import s from 'ajv-ts'
 *
 * const tuple = s.array(s.string(), s.number())
 * tuple.schema // {type: 'array', items: [{type: 'string'}, {type: 'number'}] }
 */
function array<S extends AnySchemaBuilder = AnySchemaBuilder>(
  definition?: S,
): ArraySchemaBuilder<Infer<S>, Infer<S>[], S, { maxLength: undefined, minLength: undefined, prefix: [] }> {
  return new ArraySchemaBuilder(definition);
}

type AssertArray<T> = T extends any[] ? T : never;
type TupleItems = [AnySchemaBuilder, ...AnySchemaBuilder[]];
type OutputTypeOfTuple<T extends TupleItems | []> = AssertArray<{
  [k in keyof T]: T[k] extends SchemaBuilder<any, any, any>
  ? T[k]["_output"]
  : never;
}>;

type OutputTypeOfTupleWithRest<
  T extends TupleItems | [],
  Rest extends SchemaBuilder | null = null,
> = Rest extends SchemaBuilder
  ? [...OutputTypeOfTuple<T>, ...Infer<Rest>[]]
  : OutputTypeOfTuple<T>;

class TupleSchemaBuilder<
  Schemas extends TupleItems | [] = TupleItems,
> extends SchemaBuilder<OutputTypeOfTupleWithRest<Schemas>, ArraySchema> {
  constructor(...defs: Schemas) {
    super({
      type: "array",
      prefixItems: defs.map((def) => def.schema),
      additionalItems: false,
    });
  }
  /** set `unevaluatedItems` to `false`. That means that all properties should be evaluated */
  required() {
    this.schema.unevaluatedItems = false;
    return this;
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
  return new TupleSchemaBuilder(...defs);
}

class EnumSchemaBuilder<
  Enum extends EnumLike = EnumLike,
  Tuple extends Enum[keyof Enum][] = Enum[keyof Enum][],
> extends SchemaBuilder<Tuple, EnumAnnotation, Tuple[number]> {
  private _enum: Record<string, unknown> = {};

  readonly options = [] as unknown as Tuple;

  constructor(values: Tuple) {
    // TODO: warning about tuple appears here in strict mode. Need to declare `type` field
    super({ enum: values as never });
    values.forEach((v: any) => {
      this._enum[v] = v;
    });
    this.options = values;
  }

  /**
   * returns enum as object representation
   */
  get enum(): Enum {
    return this._enum as never;
  }
}
type EnumLike = { [k: string]: string | number;[nu: number]: string };

class NativeEnumSchemaBuilder<T extends EnumLike> extends SchemaBuilder<
  T,
  EnumAnnotation
> {
  get enum(): T {
    return this.enumValues;
  }
  get options(): (keyof T)[] {
    return Object.values(this.enumValues);
  }
  constructor(private enumValues: T) {
    super({ enum: Object.values(enumValues) });
  }
}

/**
 * handle `enum` typescript type to make `enum` JSON annotation
 */
function makeEnum<E extends EnumLike = EnumLike>(
  enumLike: E,
): EnumSchemaBuilder<E, E[keyof E][]>;
/**
 * handle tuple(array) of possible values to make `enum` JSON annotation
 */
function makeEnum<
  P extends string | number = string | number,
  T extends P[] | readonly P[] = [],
  U extends UnionToTuple<T[number]> = UnionToTuple<T[number]>,
>(
  possibleValues: T,
): EnumSchemaBuilder<
  { [K in Extract<T[number], string>]: K },
  Extract<T[number], string>[]
>;
function makeEnum(tupleOrEnum: unknown) {
  if (
    typeof tupleOrEnum === "object" &&
    tupleOrEnum !== null &&
    !Array.isArray(tupleOrEnum)
  ) {
    // enum
    return new NativeEnumSchemaBuilder(tupleOrEnum as never);
  } else if (Array.isArray(tupleOrEnum)) {
    // tuple
    return new EnumSchemaBuilder(tupleOrEnum);
  }
  throw new Error(`Cannot handle non tuple or non enum type.`, {
    cause: { type: typeof tupleOrEnum, value: tupleOrEnum },
  });
}

class ConstantSchemaBuilder<
  T extends number | string | boolean | null | object = never,
> extends SchemaBuilder<T, ConstantAnnotation> {
  constructor(readonly value: T) {
    super({ const: value });
  }
}
/**
 * `const` is used to restrict a value to a single value.
 *
 * zod differences - `Date` is supported.
 * @alias literal
 * @satisfies zod API. **NOTE:** `Symbol`, unserializable `object` is not supported and throws error.
 * @example
 * const constant = s.const("Hello World")
 * constant.validate("Hello World") // true
 * constant.validate("Hello World 1") // false
 */
function constant<T extends number | string | boolean | null | object>(
  value: T,
) {
  return new ConstantSchemaBuilder<T>(value);
}

class UnionSchemaBuilder<
  S extends AnySchemaBuilder[] = AnySchemaBuilder[],
> extends SchemaBuilder<Infer<S[number]>, AnySchemaOrAnnotation> {
  constructor(...schemas: S) {
    super({
      anyOf: schemas.map((s) => s.schema),
    } as AnySchemaOrAnnotation);
  }
}

function or<S extends AnySchemaBuilder[] = SchemaBuilder[]>(...defs: S) {
  return new UnionSchemaBuilder<S>(...defs);
}

class IntersectionSchemaBuilder<
  S extends AnySchemaBuilder[] = SchemaBuilder[],
  Elem extends AnySchemaBuilder = S[number],
  Intersection extends
  AnySchemaBuilder = UnionToIntersection<Elem> extends SchemaBuilder
  ? UnionToIntersection<Elem>
  : SchemaBuilder,
> extends SchemaBuilder<
  Infer<Elem>,
  AnySchemaOrAnnotation,
  Infer<Intersection>
> {
  constructor(...schemas: S) {
    super({
      allOf: schemas.map((s) => s.schema),
    } as AnySchemaOrAnnotation);
  }
}

function and<S extends AnySchemaBuilder[] = SchemaBuilder[]>(...defs: S) {
  return new IntersectionSchemaBuilder<S>(...defs);
}

type PropKey = Exclude<PropertyKey, symbol>;

/**
 * Extract keys from given schema `s.object` and set as constant for output schema
 *
 * TypeScript - `keyof T` type
 *
 * JSON schema - `{anyOf: [{const: 'key1'}, {const: 'key2'}, ...] }`
 * @throws `Error` if given schema doesn't have `properties` properties. Only non-empty `object` schema has `properties` properties.
 */
function keyof<
  ObjSchema extends ObjectSchemaBuilder,
  Res extends PropKey = keyof ObjSchema["_output"] extends PropKey
  ? keyof ObjSchema["_output"]
  : never,
>(obj: ObjSchema): UnionSchemaBuilder<ConstantSchemaBuilder<Res>[]> {
  if (!obj.schema.properties) {
    throw new Error(
      `cannot get keys from not an object. Got ${obj.schema.type}`,
      { cause: { schema: obj.schema, instance: obj } },
    );
  }
  const schemas = Object.keys(obj.schema.properties).map((prop) =>
    constant(prop),
  );
  return or(...schemas) as never;
}

class UnknownSchemaBuilder<T extends unknown | any> extends SchemaBuilder<
  T,
  any
> {
  constructor() {
    super({} as AnySchemaOrAnnotation);
  }
}

/**
 * TypeScript - `any` type
 *
 * JSON schema - `{}` (empty object)
 */
function any(): SchemaBuilder<any, any> {
  return new UnknownSchemaBuilder();
}

/**
 * Same as {@link any} but for typescript better type quality.
 *
 * TypeScript - `unknown` type
 *
 * JSON schema - `{}` (empty object)
 */
function unknown() {
  return new UnknownSchemaBuilder<unknown>();
}

class NeverSchemaBuilder extends SchemaBuilder<never> {
  constructor() {
    super({ not: {} } as AnySchemaOrAnnotation);
  }
}
/**
 * Typescript - `never` type.
 *
 * JSON Schema - `{ not: {} }`
 */
function never() {
  return new NeverSchemaBuilder();
}

class NotSchemaBuilder<
  S extends AnySchemaBuilder = SchemaBuilder<any, any, any>,
  T extends number | string | boolean | object | null | Array<unknown> =
  | number
  | string
  | boolean
  | object
  | null
  | Array<unknown>,
  Out = Exclude<T, S["_output"]>,
> extends SchemaBuilder<S["_output"], AnySchemaOrAnnotation, Out> {
  constructor(schema: S) {
    super({
      not: schema.schema,
    } as AnySchemaOrAnnotation);
  }
}

/**
 * The `not` declares that an instance validates if it doesn't validate against the given subschema.
 *
 * **NOTE:** `s.not(s.string())` and `s.string().not()` is not the same!
 *
 * JSON Schema: `{ not: <json schema> }`
 *
 * @see {@link https://json-schema.org/understanding-json-schema/reference/combining#not json schema `not` keyword}
 * @see {@link SchemaBuilder.not not method}
 * @example
 * import s from 'ajv-ts'
 *
 * const notString = s.not(s.string())
 * // or
 * const notStringAlternative = s.string().not()
 *
 * notString.parse(42) // OK
 * notString.parse({key: 'value'}) // OK
 * notString.parse('I am a string') // throws
 */
function not<S extends AnySchemaBuilder = AnySchemaBuilder>(def: S) {
  return new NotSchemaBuilder<S>(def);
}

/**
 * get JSON-schema from somewhere and merge with `baseSchema`
 * @param externalJsonSchema external schema. E.g. from swagger
 * @param [baseSchema=any() as S] schema to use. Default is `s.any()`.
 * @example
 * const v = s.fromJSON({someCustomProp: true}, s.string())
 * v.schema.someCustomProp === true
 * v.schema.type === 'string'
 */
function fromJSON<const T, S extends AnySchemaBuilder>(
  externalJsonSchema: T,
  baseSchema: S = any() as S
): S {
  baseSchema.schema = { ...baseSchema.schema, ...externalJsonSchema };
  return baseSchema;
}

function injectAjv<S extends SchemaBuilder = SchemaBuilder>(
  ajv: Ajv,
  schemaBuilderFn: (...args: any[]) => S,
): (...args: unknown[]) => S {
  return new Proxy(schemaBuilderFn, {
    apply(target, thisArg, argArray) {
      const result = Reflect.apply(target, thisArg, argArray);
      result.ajv = ajv;
      return result;
    },
  });
}

/**
 * Create new instance of schema definition with non default AJV instance
 *
 * @example
 * import Ajv from 'ajv'
 * import s from 'ajv-ts'
 *
 * const myAjv = new Ajv(/custom options/);
 * const builder = s.create(myAjv)
 *
 * builder.number().parse(123) // OK, but use myAjv instance instead of default
 */
function create(ajv: Ajv) {
  return {
    number: injectAjv(ajv, number) as typeof number,
    integer: injectAjv(ajv, integer) as typeof integer,
    int: injectAjv(ajv, integer) as typeof integer,
    string: injectAjv(ajv, string) as typeof string,
    null: injectAjv(ajv, nil) as typeof nil,
    enum: injectAjv(ajv, makeEnum) as typeof makeEnum,
    nativeEnum: injectAjv(ajv, makeEnum) as typeof makeEnum,
    boolean: injectAjv(ajv, boolean) as typeof boolean,
    object: injectAjv(ajv, object) as typeof object,
    keyof: injectAjv(ajv, keyof) as typeof keyof,
    record: injectAjv(ajv, record) as typeof record,
    array: injectAjv(ajv, array) as typeof array,
    tuple: injectAjv(ajv, tuple) as typeof tuple,
    const: injectAjv(ajv, constant) as typeof constant,
    literal: injectAjv(ajv, constant) as typeof constant,
    unknown: injectAjv(ajv, unknown) as typeof unknown,
    any: injectAjv(ajv, any) as typeof any,
    never: injectAjv(ajv, never) as typeof never,
    or: injectAjv(ajv, or) as typeof or,
    union: injectAjv(ajv, or) as typeof or,
    and: injectAjv(ajv, and) as typeof and,
    intersection: injectAjv(ajv, and) as typeof and,
    not: injectAjv(ajv, not) as typeof not,
    fromJSON,
  };
}

export {
  DEFAULT_AJV as Ajv,
  and,
  any,
  array,
  boolean,
  constant as const,
  create,
  makeEnum as enum,
  integer as int,
  integer,
  and as intersection,
  keyof,
  constant as literal,
  makeEnum as nativeEnum,
  never,
  create as new,
  not,
  nil as null,
  number,
  object,
  or,
  record,
  string,
  tuple,
  or as union,
  unknown,
  fromJSON,
  type AnySchemaBuilder as Any,
  type NumberSchemaBuilder as Number,
  type StringSchemaBuilder as String,
  type BooleanSchemaBuilder as Boolean,
  type NullSchemaBuilder as Null,
  type UnknownSchemaBuilder as Unknown,
  type NeverSchemaBuilder as Never,
  type ArraySchemaBuilder as Array,
  type ObjectSchemaBuilder as Object,
  type UnionSchemaBuilder as Or,
  type IntersectionSchemaBuilder as And,
  type Infer as infer,
  type Input as input,
};

/**
 * Extract schema level defenition and return it's represenation as typescript type
 */
export type Infer<T extends SchemaBuilder<any, any, any, any>> = T["_output"];

/** Extract SchemaBuilder[] - used in array schema to build right types */
export type InferArray<
  T extends SchemaBuilder[],
  Result extends unknown[] = [],
> = T extends []
  ? unknown[]
  : T extends [
    infer First extends SchemaBuilder,
    ...infer Rest extends SchemaBuilder[],
  ]
  ? Rest extends []
  ? [...Result, Infer<First>]
  : InferArray<Rest, [...Result, Infer<First>]>
  : T extends Array<infer El extends SchemaBuilder>
  ? [...Result, ...Infer<El>[]]
  : Result;

/** extract schema input type */
export type Input<T extends SchemaBuilder<any, any, any, any>> = T["_input"];

export type MatchTypeToBuilder<T> = T extends boolean
  ? BooleanSchemaBuilder<T>
  : T extends Array<infer El extends number | string | object | boolean | null>
  ? ArraySchemaBuilder<MatchTypeToBuilder<El>[]>
  : T extends string
  ? StringSchemaBuilder<T>
  : T extends number
  ? NumberSchemaBuilder<T>
  : T extends Record<
    string,
    number | boolean | string | object | unknown[] | null
  >
  ? { [K in keyof T]: MatchTypeToBuilder<T[K]> }
  : T extends null
  ? NullSchemaBuilder
  : T extends undefined
  ? SchemaBuilder<T | undefined, any, T | undefined>
  : T extends unknown
  ? UnknownSchemaBuilder<T>
  : T extends SchemaBuilder<any, any, infer Out>
  ? SchemaBuilder<any, any, Out>
  : SchemaBuilder<any, any, any>;
