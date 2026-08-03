import type {
  And,
  GreaterThan,
  GreaterThanOrEqual,
  IsFloat,
  IsInteger,
  LessThan,
  LessThanOrEqual,
  Or,
  SetOptional,
} from "type-fest";

import type { NumberSchema } from "../schema/types";
import type { Debug } from "../types";
import type { TTypeError, TTypeErrorNotSame } from "../types/errors";
import type { OmitMany, OmitUndefined, Prettify } from "../types/object";
import { SchemaBuilder } from "./base";

type NumberSchemaOpts = {
  readonly type: "number" | "integer";
  readonly format: NumberSchema["format"] | undefined;
  readonly minValue: number | undefined;
  readonly maxValue: number | undefined;
  readonly const: number | undefined;
};

type DefaultNumberSchema = Prettify<
  OmitUndefined<{
    readonly type: "number";
    readonly format: undefined;
    readonly minimum: undefined;
    readonly maximum: undefined;
    readonly multipleOf: undefined;
    readonly exclusiveMaximum: undefined;
    readonly exclusiveMinimum: undefined;
    readonly const: undefined;
  }>
>;

type DefaultNumberOpts = {
  readonly type: "number";
  readonly format: undefined;
  readonly minValue: undefined;
  readonly maxValue: undefined;
  readonly const: undefined;
};

class NumberSchemaBuilder<
  const Input extends number = number,
  const Schema extends NumberSchema = DefaultNumberSchema,
  const Opts extends NumberSchemaOpts = DefaultNumberOpts,
> extends SchemaBuilder<number, Schema, Input> {
  constructor(schema?: SetOptional<Schema, "type">) {
    super({ ...schema, type: "number" } as never);
  }

  integer(): NumberSchemaBuilder<
    Input,
    Prettify<
      Omit<Schema, "type"> & {
        readonly type: "integer";
      }
    >,
    Prettify<
      Omit<Opts, "type"> & {
        readonly type: "integer";
      }
    >
  > {
    this.schema.type = "integer";
    return this as never;
  }
  int = this.integer;

  number(): NumberSchemaBuilder<
    Input,
    Prettify<
      Omit<Schema, "type"> & {
        readonly type: "number";
      }
    >,
    Prettify<
      Omit<Opts, "type"> & {
        readonly type: "number";
      }
    >
  > {
    this.schema.type = "number";
    return this as never;
  }

  /**
   * Appends format for your number schema.
   */
  format<
    const Format extends NumberSchema["format"],
    FormatValid extends boolean = Opts["type"] extends "integer"
      ? Format extends "int32"
        ? true
        : Format extends "int64"
          ? true
          : // type=int. Format float or doouble
            false
      : // Rest
        true,
  >(
    format: FormatValid extends true
      ? Format
      : TTypeError<
          `Wrong format for given type.`,
          ["Expected:", '"int32" or "int64"', "Given:", Format],
          [
            Debug<Opts["type"], "Schema Type">,
            Debug<FormatValid, `Format Valid`>,
          ]
        >,
  ): NumberSchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
        OmitUndefined<
          Omit<Schema, "format"> & {
            readonly format: Format;
          }
        >
    >,
    Prettify<
      Omit<Opts, "format"> & {
        readonly format: Format;
      }
    >
  > {
    this.schema.format = format as Format;
    return this as never;
  }

  /**
   * The `const` keyword is used to restrict a value to a single value.
   * @example
   * const a = s.number().const(5)
   * a.schema // {type: "number", const: 5}
   * s.infer<typeof a> // 5
   */
  const<
    const N extends number,
    TypeValid extends boolean = Opts["type"] extends "integer"
      ? IsInteger<N>
      : Or<IsFloat<N>, IsInteger<N>>,
    FormatValid extends boolean = Opts["format"] extends "int32"
      ? IsInteger<N>
      : Opts["format"] extends "int64"
        ? IsInteger<N>
        : Or<IsFloat<N>, IsInteger<N>>,
    ValueValid extends boolean = Opts["maxValue"] extends number
      ? Opts["minValue"] extends number
        ? And<
            LessThanOrEqual<N, Opts["maxValue"]>,
            GreaterThanOrEqual<N, Opts["minValue"]>
          >
        : LessThanOrEqual<N, Opts["maxValue"]>
      : true,
  >(
    value: TypeValid extends true
      ? FormatValid extends true
        ? ValueValid extends true
          ? N
          : TTypeErrorNotSame<
              `Constant cannot be more than "MaxValue" and less than "MinValue"`,
              [`MinValue:`, Opts["minValue"], "MaxValue:", Opts["maxValue"]],
              [
                Debug<Opts["format"], "Schema Format">,
                Debug<TypeValid, `Type Valid`>,
                Debug<FormatValid, `Format Valid`>,
                Debug<ValueValid, `Value Valid`>,
              ]
            >
        : TTypeError<
            `Format invalid.`,
            ["Expected:", Opts["format"], "Got:", N],
            [
              Debug<Input, "Input">,
              Debug<Opts["format"], "Schema Format">,
              Debug<TypeValid, `Type Valid`>,
              Debug<FormatValid, `Format Valid`>,
              Debug<ValueValid, `Value Valid`>,
            ]
          >
      : TTypeError<
          `Type invalid.`,
          ["Expected:", Input, "Got:", N],
          [Debug<TypeValid, `Type Valid`>, Debug<FormatValid, `Format Valid`>]
        >,
  ): NumberSchemaBuilder<
    N,
    Prettify<
      Pick<Schema, "type"> &
        OmitUndefined<
          Omit<Schema, "const"> & {
            readonly const: N;
          }
        >
    >,
    Prettify<
      Omit<Opts, "const"> & {
        readonly const: N;
      }
    >
  > {
    this.schema.const = value as number;
    return this as never;
  }

  /**
   * Provides minimum value
   *
   * Set schema `minimum = value` (and add `exclusiveMinimum = true` if needed)
   * @param minValue min value
   * @param [exclusive=false as Exclusive] exclusiveness. If `true` - same as `>=`. Default is `false`
   * @example
   * s.number().minimum(2, true) // > 2
   * s.number().minimum(2) // >= 2
   */
  minimum<
    const Min extends number,
    const Exclusive extends boolean = false,
    MinLengthValid extends boolean = Opts["maxValue"] extends number
      ? GreaterThan<Opts["maxValue"], Min>
      : true,
    TypeValid extends boolean = Opts["type"] extends "integer"
      ? IsInteger<Min>
      : Or<IsFloat<Min>, IsInteger<Min>>,
    FormatValid extends boolean = Opts["format"] extends undefined
      ? true
      : Opts["format"] extends "int32"
        ? IsInteger<Min>
        : Opts["format"] extends "int64"
          ? IsInteger<Input>
          : Or<IsFloat<Min>, IsInteger<Min>>,
  >(
    minValue: MinLengthValid extends true
      ? TypeValid extends true
        ? FormatValid extends true
          ? Min
          : TTypeError<
              `Format invalid.`,
              ["Expected format:", Opts["format"], "Got:", Min],
              [
                Debug<MinLengthValid, `Min Length Valid`>,
                Debug<TypeValid, `Type Valid`>,
                Debug<FormatValid, `Format Valid`>,
              ]
            >
        : TTypeError<
            `Type invalid.`,
            ["Expected type", Opts["type"], "Got:", Min],
            [
              Debug<MinLengthValid, "MinLength valid">,
              Debug<TypeValid, `Type Valid`>,
              Debug<FormatValid, `Format Valid`>,
            ]
          >
      : TTypeErrorNotSame<
          `"MaxValue" is less than "MinValue"`,
          ["MaxValue:", Opts["maxValue"], "MinValue:", Min],
          [
            Debug<MinLengthValid, "MinLength valid">,
            Debug<TypeValid, `Type Valid`>,
            Debug<FormatValid, `Format Valid`>,
          ]
        >,
    exclusive: Exclusive = false as Exclusive,
  ): NumberSchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
        OmitUndefined<
          OmitMany<Schema, ["minimum", "exclusiveMinimum"]> & {
            readonly minimum: Exclusive extends true ? undefined : Min;
            readonly exclusiveMinimum: Exclusive extends true ? Min : undefined;
          }
        >
    >,
    Prettify<
      Omit<Opts, "minValue"> & {
        readonly minValue: Min;
      }
    >
  > {
    if (exclusive) {
      this.schema.exclusiveMinimum = minValue as Min;
    } else {
      this.schema.minimum = minValue as Min;
    }
    return this as never;
  }
  /**
   * Provides minimum value
   *
   * Set schema `minimum = value` (and add `exclusiveMinimum = true` if needed)
   * @example
   * s.number().min(2, true) // > 2
   * s.number().min(2) // >= 2
   */
  min = this.minimum;

  /**
   * marks you number maximum value
   * Set schema `maximum = value` (and add `exclusiveMaximum = true` if needed)
   * @example
   * s.number().maximum(2, true) // < 2
   * s.number().maximum(2) // <= 2
   */
  maximum<
    const Max extends number,
    const Exclusive extends boolean = false,
    FormatValid extends boolean = Opts["format"] extends undefined
      ? true
      : IsInteger<Max> extends true
        ? Opts["format"] extends "int32"
          ? true
          : Opts["format"] extends "int64"
            ? true
            : false
        : true,
    TypeValid extends boolean = Opts["type"] extends "integer"
      ? IsInteger<Max>
      : Or<IsFloat<Max>, IsInteger<Max>>,
    MinLengthValid extends boolean = Opts["minValue"] extends number
      ? LessThan<Opts["minValue"], Max>
      : true,
  >(
    max: MinLengthValid extends true
      ? TypeValid extends true
        ? FormatValid extends true
          ? Max
          : TTypeError<
              `Format invalid.`,
              ["Expected format:", Opts["format"], "Got:", Max],
              [
                Debug<MinLengthValid, "MinLength valid">,
                Debug<TypeValid, `Type Valid`>,
                Debug<FormatValid, `Format Valid`>,
              ]
            >
        : TTypeError<
            `Type invalid.`,
            ["Expected type:", Opts["type"], "Got", Max],
            [
              Debug<MinLengthValid, "MinLength valid">,
              Debug<TypeValid, `Type Valid`>,
              Debug<FormatValid, `Format Valid`>,
            ]
          >
      : TTypeErrorNotSame<
          `"MinValue" greater than "MaxValue"`,
          ["MinValue:", Opts["minValue"], "MaxValue:", Max],
          [
            Debug<MinLengthValid, "MinLength valid">,
            Debug<TypeValid, `Type Valid`>,
            Debug<FormatValid, `Format Valid`>,
          ]
        >,
    exclusive: Exclusive = false as Exclusive,
  ): NumberSchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
        OmitUndefined<
          OmitMany<Schema, ["maximum", "exclusiveMaximum"]> & {
            readonly maximum: Exclusive extends true ? undefined : Max;
            readonly exclusiveMaximum: Exclusive extends true ? Max : undefined;
          }
        >
    >,
    Prettify<
      Omit<Opts, "maxValue"> & {
        readonly maxValue: Max;
      }
    >
  > {
    if (exclusive) {
      this.schema.exclusiveMaximum = max as Max;
    } else {
      this.schema.maximum = max as Max;
    }
    return this as never;
  }
  /**
   * marks you number maximum value
   * Set schema `maximum = value` (and add `exclusiveMaximum = true` if needed)
   * @example
   * s.number().max(2, true) // < 2
   * s.number().max(2) // <= 2
   */
  max = this.maximum;

  /** Getter. Retuns `minimum` or `exclusiveMinimum` depends on your schema definition */
  get getMinValue(): Opts["minValue"] extends number
    ? Opts["minValue"]
    : number {
    return (this.schema.minimum ??
      (this.schema.exclusiveMinimum as number as never)) as never;
  }

  /** Getter. Retuns `minimum` or `exclusiveMinimum` depends on your schema definition */
  get getMaxValue(): Opts["maxValue"] extends number
    ? Opts["maxValue"]
    : number {
    return (this.schema.maximum ??
      (this.schema.exclusiveMaximum as number as never)) as never;
  }

  /**
   * Greater than
   *
   * Range: `(value; Infinity)`
   * @see {@link maximum} method
   * @see {@link gte} method
   */
  gt<const V extends number>(value: V) {
    return this.minimum<V, true>(value as never, true);
  }
  /**
   * Greater than or equal
   *
   * Range: `[value; Infinity)`
   * @see {@link maximum maximum}
   * @see {@link gt gt}
   */
  gte<const V extends number>(value: V) {
    return this.minimum<V>(value as never);
  }

  /**
   * Less than
   *
   * Range: `(value; Infinity)`
   * @see {@link minimum minimum} method
   * @see {@link lte lte} method
   */
  lt<const V extends number>(value: V) {
    return this.max<V, true>(value as never, true);
  }

  /**
   * Less than or Equal
   *
   * Range: `[value; Infinity)`
   * @see {@link minimum} method
   * @see {@link lt} method
   */
  lte<const V extends number>(value: V) {
    return this.max<V>(value as never);
  }

  /**
   * The value must be a multiple of the given number.
   */
  multipleOf<const V extends number>(
    value: V,
  ): NumberSchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
        OmitUndefined<
          Omit<Schema, "multipleOf"> & {
            readonly multipleOf: V;
          }
        >
    >,
    Opts
  > {
    this.schema.multipleOf = Math.abs(value);
    return this as never;
  }
  /** Alias for {@link multipleOf} */
  step = this.multipleOf;

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
    return this.lte(Number.MAX_SAFE_INTEGER as 9007199254740991).gte(
      Number.MIN_SAFE_INTEGER as -9007199254740991,
    );
  }
}

export function number<const N extends number = number>() {
  return new NumberSchemaBuilder<N>();
}

export function integer<const N extends number = number>() {
  return new NumberSchemaBuilder<N>().integer();
}

export const int = integer;
