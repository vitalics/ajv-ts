import Ajv from 'ajv';
import { AnySchemaOrAnnotation } from '../schema/types'
export class SchemaBuilder<
  Input = unknown,
  Schema extends AnySchemaOrAnnotation = AnySchemaOrAnnotation,
  Output = Input,
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