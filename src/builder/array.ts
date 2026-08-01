import { type LessThan, Merge } from "type-fest";
import type { AnySchemaBuilder } from "./base";

import {
  type AnySchemaOrAnnotation,
  type ArraySchema,
  type BooleanSchema,
  type NumberSchema,
  type StringSchema,
} from "../schema/types";
import type { Create, Drop, MakeReadonly, Optional } from "../types/array";
import type { TRangeError, TTypeErrorNotSame } from "../types/errors";
import type { IsPositiveInteger, Minus } from "../types/number";
import type { OmitMany, Prettify } from "../types/object";
import { SchemaBuilder } from "./base";

export type InferArray<
  S extends readonly AnySchemaBuilder[],
  Result extends readonly unknown[] = [],
> = S extends readonly [
  infer First extends AnySchemaBuilder,
  ...infer Rest extends readonly AnySchemaBuilder[],
]
  ? InferArray<Rest, [...Result, First["_output"]]>
  : Result;

type InferSchemaBuilderArrayToSchema<
  T extends readonly AnySchemaBuilder[],
  Result extends readonly AnySchemaOrAnnotation[] = [],
> = T extends readonly [
  infer First extends AnySchemaBuilder,
  ...infer Rest extends readonly AnySchemaBuilder[],
]
  ? InferSchemaBuilderArrayToSchema<Rest, [...Result, First["_schema"]]>
  : Result;

type InferAnyShemaOrAnnotationType<T extends AnySchemaOrAnnotation> =
  T extends NumberSchema
  ? number
  : T extends StringSchema
  ? string
  : T extends BooleanSchema
  ? boolean
  : T extends { enum: infer ArrayOfValues extends readonly string[] }
  ? ArrayOfValues
  : unknown;

type InferAnySchemaOrAnnotationArray<
  T extends readonly AnySchemaOrAnnotation[],
  Result extends readonly unknown[] = [],
> = T extends [
  infer First extends AnySchemaOrAnnotation,
  ...infer Rest extends readonly AnySchemaOrAnnotation[],
]
  ? InferAnySchemaOrAnnotationArray<
    Rest,
    [...Result, InferAnyShemaOrAnnotationType<First>]
  >
  : Result;

type GetItemsFromSchema<Schema extends ArraySchema> =
  Schema["items"] extends AnySchemaOrAnnotation
  ? InferAnyShemaOrAnnotationType<Schema["items"]>[]
  : Schema["items"] extends readonly AnySchemaOrAnnotation[]
  ? InferAnySchemaOrAnnotationArray<Schema["items"]>
  : [];

type GetPrefixItemsFromSchema<Schema extends ArraySchema> =
  Schema["prefixItems"] extends readonly AnySchemaOrAnnotation[]
  ? InferAnySchemaOrAnnotationArray<Schema["prefixItems"]>
  : [];

export type BuildArrayFromSchema<
  Schema extends ArraySchema,
  Result extends readonly unknown[] = [...GetItemsFromSchema<Schema>],
  El = GetItemsFromSchema<Schema>[number],
> = Schema["maxItems"] extends number
  ? Schema["minItems"] extends number
  ? BuildArrayFromSchema<
    Pick<Schema, "type"> & OmitMany<Schema, ["maxItems", "minItems"]>,
    [
      ...minItems: Create<Schema["minItems"], El>,
      ...maxItems: Optional<
        Create<Minus<Schema["maxItems"], Schema["minItems"]>, El>
      >,
    ]
  >
  : BuildArrayFromSchema<
    Pick<Schema, "type"> & Omit<Schema, "maxItems">,
    [...maxItems: Create<Schema["maxItems"], El>]
  >
  : Schema["minItems"] extends number
  ? Schema["minItems"] extends 0
  ? BuildArrayFromSchema<
    Pick<Schema, "type"> & Omit<Schema, "minItems">,
    Result
  >
  : BuildArrayFromSchema<
    Pick<Schema, "type"> & Omit<Schema, "minItems">,
    [
      ...minItems: Create<Schema["minItems"], El>,
      ...items: Optional<Drop<Result, Schema["minItems"]>>,
    ]
  >
  : Schema["prefixItems"] extends readonly AnySchemaOrAnnotation[]
  ? BuildArrayFromSchema<
    Pick<Schema, "type"> & Omit<Schema, "prefixItems">,
    [...prefixItems: GetPrefixItemsFromSchema<Schema>, ...items: Result]
  >
  : Schema["readOnly"] extends true
  ? BuildArrayFromSchema<
    Pick<Schema, "type"> & Omit<Schema, "readOnly">,
    MakeReadonly<Result>
  >
  : Result;

class ElementSchemaBuilder<
  S extends AnySchemaOrAnnotation,
  Out,
> extends SchemaBuilder<S, S, Out> { }

// @ts-expect-error infinite
export class ArraySchemaBuilder<
  const Input extends AnySchemaOrAnnotation = AnySchemaOrAnnotation,
  const Schema extends ArraySchema = {
    readonly type: "array";
    readonly items: Input;
  },
  const Output extends readonly unknown[] = BuildArrayFromSchema<Schema>,
> extends SchemaBuilder<Input, Schema, Output> {
  constructor(definition?: Input) {
    super({
      type: "array",
      items: definition ?? {},
      minItems: 0,
    } as Schema);
  }

  /**
   * Mark your array `readOnly`.
   */
  override readonly(): ArraySchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
      Omit<Schema, "readOnly"> & {
        readonly readOnly: true;
      }
    >,
    MakeReadonly<Output>
  > {
    this.schema.readOnly = true;
    return this as never;
  }

  /**
   * set `prefixItems` in your schema.
   *
   * **NOTE:** For better DX - we mark `prefixItems` and `items` as 2 separate arrays to understands what happens
   */
  prefix<
    const El extends AnySchemaBuilder,
    const PrefixesSchema extends readonly El[],
  >(
    ...definitions: PrefixesSchema
  ): ArraySchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
      Omit<Schema, "prefixItems"> & {
        readonly prefixItems: InferSchemaBuilderArrayToSchema<PrefixesSchema>;
      }
    >,
    Output
  > {
    this.schema.prefixItems = definitions.map((def) => def.schema);
    return this as never;
  }

  addItems<const El extends AnySchemaBuilder, const S extends readonly El[]>(
    ...shemas: S
  ): ArraySchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
      Omit<Schema, "items"> & {
        readonly items: [Input, ...InferSchemaBuilderArrayToSchema<S>];
      }
    >,
    Output
  > {
    if (Array.isArray(this.schema.items)) {
      this.schema.items.push(...shemas.map((el) => el.schema));
    } else if (typeof this.schema.items === "object") {
      const prev = this.schema.items;
      const isEmptyObject =
        Object.keys(prev).length === 0 && prev.constructor === Object;
      if (isEmptyObject) {
        this.schema.items = shemas.map((el) => el.schema);
      } else {
        this.schema.items = [prev, ...shemas.map((el) => el.schema)];
      }
    } else {
      this.schema.items = shemas.map((el) => el.schema);
    }
    return this as never;
  }

  /**
   * Must contain less items or equal than declared
   * @see `length`
   * @see `ArraySchemaBuilder.minLength`
   * @example
   * const arr = s.array(s.number()).maxLength(3)
   * arr.parse([1, 2, 3]) // OK
   * arr.parse([1]) // OK
   * arr.parse([1, 2, 3, 4]) // Error
   */
  maxLength<
    const L extends number,
    const IsValidByMaxLength extends boolean =
    Schema["maxLength"] extends undefined
    ? true
    : Schema["maxLength"] extends number
    ? LessThan<L, Schema["maxLength"]>
    : true,
  >(
    value: IsPositiveInteger<L> extends false
      ? TTypeErrorNotSame<
        L,
        "Positive integer (> 0)",
        [
          `Is Valid By Max Length? ${IsValidByMaxLength}`,
          `Is Positive Integer? ${IsPositiveInteger<L>}`,
        ]
      >
      : IsValidByMaxLength extends false
      ? TRangeError<
        `MaxLength is less than minLength.`,
        [`MinLength: ${L}`, `MaxLength: ${Schema["maxLength"]}`]
      >
      : L extends 0
      ? TTypeErrorNotSame<
        L,
        "Only Positive and non floating numbers are supported.",
        [
          `Is Valid By Max Length? ${IsValidByMaxLength}`,
          `Is Positive Integer? ${IsPositiveInteger<L>}`,
          `L === 0 ? '${L extends 0 ? true : false}'`,
        ]
      >
      : L,
  ): ArraySchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
      Omit<Schema, "maxItems"> & {
        readonly maxItems: L;
      }
    >,
    Output
  > {
    if ((value as L) < 0) {
      throw new TypeError(
        "Only Positive and non floating numbers are supported.",
        {
          cause: new RangeError(`expected incoming value < 0. Got ${value}`),
        },
      );
    }
    this.schema.maxItems = value as L;
    return this as never;
  }

  /**
   * Must contain less items or equal than declared
   * @see `ArraySchemaBuilder.length`
   * @see `ArraySchemaBuilder.minLength`
   * @example
   * const arr = s.array(s.number()).maxLength(3)
   * arr.parse([1, 2, 3]) // OK
   * arr.parse([1]) // OK
   * arr.parse([1, 2, 3, 4]) // Error
   */
  max = this.maxLength;

  minLength<
    const L extends number,
    const IsValidByMaxLength extends boolean =
    Schema["maxItems"] extends undefined
    ? true
    : Schema["maxItems"] extends number
    ? LessThan<L, Schema["maxItems"]>
    : true,
  >(
    value: IsPositiveInteger<L> extends false
      ? TTypeErrorNotSame<
        L,
        `MinLength should be positive integer`,
        [
          `Is Valid By Max Length? '${IsValidByMaxLength}'`,
          `Is Positive Integer? '${IsPositiveInteger<L>}'`,
        ]
      >
      : IsValidByMaxLength extends false
      ? TRangeError<
        `MaxLength is less than minLength.`,
        [`MinLength: ${L}`, `MaxItems: ${Schema["maxItems"]}`],
        [
          `Is Valid By Max Length? '${IsValidByMaxLength}'`,
          `Is Positive Integer? '${IsPositiveInteger<L>}'`,
        ]
      >
      : L extends 0
      ? TTypeErrorNotSame<
        L,
        "Only Positive and non floating numbers are supported.",
        [
          `Is Valid By Max Length? ${IsValidByMaxLength}`,
          `Is Positive Integer? ${IsPositiveInteger<L>}`,
          `L === 0 ? '${L extends 0 ? true : false}'`,
        ]
      >
      : L,
  ): ArraySchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
      Omit<Schema, "minItems"> & {
        readonly minItems: L;
      }
    >
  > {
    if ((value as L) < 0) {
      throw new TypeError(
        "Only Positive and non floating numbers are supported.",
        {
          cause: new RangeError(`expected incoming value < 0. Got ${value}`),
        },
      );
    }
    this.schema.minItems = value as L;
    return this as never;
  }

  length<const L extends number>(
    value: L,
  ): ArraySchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
      OmitMany<Schema, ["maxItems", "minItems"]> & {
        readonly maxItems: L;
        readonly minItems: L;
      }
    >,
    Output
  > {
    return this.minLength<L>(value as never).maxLength<L>(
      value as never,
    ) as never;
  }

  /**
   * Same as `s.array().minLength(1)`
   * @see `ArraySchemaBuilder.minLength`
   */
  nonEmpty(): ArraySchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
      Omit<Schema, "minItems"> & {
        readonly minItems: 1;
      }
    >,
    Output
  > {
    return this.minLength<1>(1 as never);
  }

  /**
   * Set the `uniqueItems` keyword to `true`.
   * @example
   * const items = s.array(s.number()).unique()
   * items.parse([1, 2, 3, 4, 5]) // OK
   * items.parse([1, 2, 3, 3, 3]) // Error: items are not unique
   */
  unique(): ArraySchemaBuilder<
    Input,
    Prettify<
      Schema & {
        readonly uniqueItems: true;
      }
    >,
    Output
  > {
    this.schema.uniqueItems = true;
    return this as never;
  }

  /**
   * Returns schema builder of the element.
   */
  get element(): SchemaBuilder<
    Input,
    Input,
    InferAnyShemaOrAnnotationType<Input>
  > {
    const elementSchema = this.schema.items;
    if (Array.isArray(elementSchema)) {
      const builder = array();
      builder.schema = { type: "array", items: elementSchema } as never;
      return builder as never;
    }
    const builder = new ElementSchemaBuilder<
      Input,
      InferAnyShemaOrAnnotationType<Input>
    >(elementSchema as never);
    return builder as never;
  }

  /**
   * `contains` schema only needs to validate against one or more items in the array.
   */
  contains<S extends AnySchemaBuilder>(
    containItem: S,
  ): ArraySchemaBuilder<
    Input,
    Prettify<
      Schema & {
        readonly contains: S["schema"];
      }
    >,
    Output
  > {
    this.schema.contains = containItem.schema;
    return this as never;
  }

  /**
   * ## draft 2019-09
   * `minContains` can be used with contains to further specify how many times a schema matches a
   * `contains` constraint.
   */
  minContains<const N extends number = number, Valid = IsPositiveInteger<N>>(
    value: Valid extends true
      ? N
      : [
        never,
        'TypeError: "minContains" should be positive integer',
        `Received: '${N}'`,
      ],
  ): ArraySchemaBuilder<
    Input,
    Prettify<
      Schema & {
        readonly minContains: N;
      }
    >,
    Output
  > {
    this.schema.minContains = value as N;
    return this as never;
  }

  /**
   * ## draft 2019-09
   * `maxContains` can be used with contains to further specify how many times a schema matches a
   * `contains` constraint.
   */
  maxContains<const N extends number = number, Valid = IsPositiveInteger<N>>(
    value: Valid extends true
      ? N
      : [
        never,
        'TypeError: "maxContains" should be positive integer',
        `Received: '${N}'`,
      ],
  ): ArraySchemaBuilder<
    Input,
    Prettify<
      Schema & {
        readonly maxContains: N;
      }
    >,
    Output
  > {
    this.schema.maxContains = value as N;
    return this as never;
  }
}

/*
 * Define schema for array of elements. Accept array of subschemas.
 * @example
 * import s from 'ajv-ts'
 *
 * const tuple = s.array(s.string(), s.number())
 * tuple.schema // {type: 'array', items: [{type: 'string'}, {type: 'number'}] }
 */
export function array<const S extends AnySchemaBuilder = AnySchemaBuilder>(
  definition?: S,
) {
  return new ArraySchemaBuilder<
    S["schema"]>(definition?.schema ?? {});
}

export default array;
