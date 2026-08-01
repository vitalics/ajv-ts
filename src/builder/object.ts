import type { Merge, SetRequired, OmitIndexSignature } from "type-fest";
import type { AnySchemaOrAnnotation, ObjectSchema } from "../schema/types";
import { type AnySchemaBuilder, SchemaBuilder } from "./base";
import type {
  Prettify,
  OptionalUndefined,
  OptionalByKey,
  RequiredByKeys,
  InferKeys,
  OmitMany,
  ObjectKeys,
} from "../types/object";
import type { ExcludeArr } from "../types/array";
import type { InferOutputType } from "./types";
import { makeEnum } from "./enum";
import type { UnionToTuple } from "../types";
import { array } from "./array";
import type { ArraySchemaBuilder } from "./array";

export type ObjectDefinition = {
  [key: string]: AnySchemaBuilder;
};

class ObjectSchemaBuilder<
  const Input extends ObjectDefinition = {},
  const Schema extends ObjectSchema = [ObjectKeys<Input>] extends [never]
    ? { readonly type: "object" }
    : Prettify<{
        readonly type: "object";
        readonly properties: {
          [K in ObjectKeys<Input>]: Input[K]["schema"];
        };
      }>,
  const Output = OptionalUndefined<{
    [P in ObjectKeys<Input>]: InferOutputType<Input[P]>;
  }>
> extends SchemaBuilder<Input, Schema, Output> {
  protected def: Input = {} as Input;
  constructor(def?: Input) {
    super({
      type: "object",
      properties: {},
    } as never);
    if (def) {
      this.def = def;
      // biome-ignore lint/complexity/noForEach: <explanation>
      Object.entries(def).forEach(([key, d]) => {
        if (!this.schema.properties) {
          this.schema.properties = {};
        }
        this.schema.properties[key] = d.schema;
      });
    }
  }

  /**
   * Convert current object schema to array schema.
   * Same as `s.array(s.object(...))`.
   */
  array(): ArraySchemaBuilder<Schema> {
    return array(this);
  }

  /**
   * set `additionalProperties=true` for your JSON-schema.
   *
   * Opposite of `strict`
   * @see {@link ObjectSchemaBuilder.strict strict}
   */
  passthrough(): ObjectSchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
        Omit<Schema, "additionalProperties"> & {
          readonly additionalProperties: true;
        }
    >,
    Output & { [key: PropertyKey]: unknown }
  > {
    this.schema.additionalProperties = true;
    return this as never;
  }

  /**
   * Makes all properties partial(not required)
   */
  partial(): ObjectSchemaBuilder<
    Input,
    Prettify<Pick<Schema, "type"> & Omit<Schema, "required">>,
    OptionalUndefined<Partial<Output>>
  > {
    // biome-ignore lint/performance/noDelete: <explanation>
    delete (this.schema as Record<string, unknown>).required;
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
  partialFor<
    const Keys extends readonly Key[],
    const Key extends keyof Output = keyof Output
  >(
    ...keys: Keys
  ): ObjectSchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
        Omit<Schema, "required"> &
        ([
          Schema extends { readonly required: readonly string[] }
            ? Readonly<ExcludeArr<Schema["required"], Keys[number]>>
            : readonly []
        ] extends [readonly []]
          ? {}
          : {
              readonly required: Schema extends {
                readonly required: readonly string[];
              }
                ? Readonly<ExcludeArr<Schema["required"], Keys[number]>>
                : readonly [];
            })
    >,
    OptionalByKey<Output, Keys[number]>
  > {
    const required = [...(this.schema.required ?? [])] as string[];
    // remove element from array. e.g. "email" for ['name', 'email'] => ['name']
    // opposite of push
    const filtered = required.filter(
      (key) => !(keys as readonly string[]).includes(key)
    );
    if (filtered.length === 0) {
      // biome-ignore lint/performance/noDelete: <explanation>
      delete (this.schema as Record<string, unknown>).required;
    } else {
      this.schema.required = [...new Set(filtered)];
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
  dependentRequired<
    const Deps extends {
      readonly [K in keyof Output]?: readonly Exclude<keyof Output, K>[];
    }
  >(
    dependencies: Deps
  ): ObjectSchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
        Omit<Schema, "dependentRequired"> & {
          readonly dependentRequired: Deps;
        }
    >,
    OptionalByKey<
      Output,
      InferKeys<Deps> extends keyof Output ? InferKeys<Deps> : keyof Output
    >
  >;
  dependentRequired<
    const Key extends keyof Output,
    const Deps extends Record<Key, readonly Exclude<keyof Output, Key>[]>
  >(
    dependencies: Deps
  ): ObjectSchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
        Omit<Schema, "dependentRequired"> & {
          readonly dependentRequired: Deps;
        }
    >,
    Output
  >;
  dependentRequired(
    dependencies: Record<string, readonly string[]>
  ): ObjectSchemaBuilder<Input, any, any> {
    this.schema.dependentRequired = dependencies as never;
    return this as never;
  }

  /**
   * Disallow additional properties for object schema `additionalProperties=false`
   *
   * If you would like to define additional properties type - use `additionalProperties`
   * @see {@link ObjectSchemaBuilder.additionalProperties additionalProperties}
   *
   * If you would like to mark properties required - use `required` or `requiredFor`
   * @see {@link ObjectSchemaBuilder.required required}
   * @see {@link ObjectSchemaBuilder.requiredFor requiredFor}
   */
  strict(): ObjectSchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
        Omit<Schema, "additionalProperties"> & {
          readonly additionalProperties: false;
        }
    >,
    OmitIndexSignature<Output>
  > {
    this.schema.additionalProperties = false;
    return this as never;
  }

  /**
   * Makes 1 property required, other keys are not required.
   *
   * If some properties is already marked with `requiredFor` - we append new key into `required` JSON schema
   */
  requiredFor<
    const KeyArr extends readonly Key[],
    const Key extends keyof Schema["properties"] = keyof Schema["properties"]
  >(
    ...keys: KeyArr
  ): ObjectSchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
        OmitMany<Schema, ["required", "properties"]> & {
          readonly required: Schema extends {
            readonly required: readonly string[];
          }
            ? UnionToTuple<Schema["required"][number] | KeyArr[number]>
            : KeyArr;
        } & {
          readonly properties: SetRequired<
            Schema["properties"],
            KeyArr[number]
          >;
        }
    >,
    RequiredByKeys<Output, KeyArr[number]>
  > {
    this.schema.required = [
      ...new Set([
        ...(this.schema.required ?? []),
        ...(keys as readonly string[]),
      ]),
    ];
    return this as never;
  }

  /**
   * Make **ALL** properties in your object required.
   *
   * If you need to make few required properties (1 or more, not everything fields) - use `requiredFor`
   * @see {@link ObjectSchemaBuilder.requiredFor requiredFor}
   */
  required(): ObjectSchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
        OmitMany<Schema, ["required", "properties"]> &
        ([UnionToTuple<keyof Output>] extends [readonly []]
          ? {}
          : {
              readonly required: UnionToTuple<keyof Output>;
              readonly properties: SetRequired<
                Schema["properties"],
                keyof Schema["properties"]
              >;
            })
    >,
    Prettify<SetRequired<Output, keyof Output>>
  > {
    const allProperties = Object.keys(this.schema.properties ?? {});
    const required = [
      ...new Set([...(this.schema.required ?? []), ...allProperties]),
    ];
    if (required.length === 0) {
      // biome-ignore lint/performance/noDelete: <explanation>
      delete (this.schema as Record<string, unknown>).required;
    } else {
      this.schema.required = required;
    }
    return this as never;
  }

  /**
   * Define schema for additional properties
   *
   * If you need to make `additionalProperties=false` use `strict` method instead
   *
   * @see {@link ObjectSchemaBuilder.strict strict}
   */
  rest<const S extends AnySchemaBuilder>(
    def: S
  ): ObjectSchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
        Omit<Schema, "additionalProperties"> & {
          readonly additionalProperties: S["_schema"];
        }
    >,
    Merge<
      Output,
      {
        [P: PropertyKey]: S["_output"];
      }
    >
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
  merge<const ObjSchema extends ObjectSchemaBuilder<any, any, any>>(
    schema: ObjSchema
  ): ObjectSchemaBuilder<
    Merge<Input, ObjSchema["_input"]>,
    Merge<Schema, ObjSchema["_schema"]> & ObjectSchema,
    Merge<Output, ObjSchema["_output"]>
  > {
    if (schema.schema.type !== "object") {
      throw new TypeError("Cannot merge not object type with object", {
        cause: {
          incoming: schema.schema,
          given: this.schema,
        },
      });
    }
    const a = object();
    a.schema = Object.assign({}, this.schema) as never;
    const props = (a.schema as ObjectSchema).properties ?? {};
    // biome-ignore lint/complexity/noForEach: <explanation>
    Object.entries(schema.def as Record<string, AnySchemaBuilder>).forEach(
      ([key, def]) => {
        props[key] = def.schema;
      }
    );
    (a.schema as ObjectSchema).properties = props;
    a.def = { ...this.def, ...schema.def };
    return a as never;
  }

  /**
   * Intersect current object schema with another object schema.
   * Alias for {@link merge}.
   */
  and<const ObjSchema extends ObjectSchemaBuilder<any, any, any>>(
    schema: ObjSchema
  ): ObjectSchemaBuilder<
    Merge<Input, ObjSchema["_input"]>,
    Merge<Schema, ObjSchema["_schema"]> & ObjectSchema,
    Merge<Output, ObjSchema["_output"]>
  > {
    return this.merge(schema) as never;
  }

  /**
   * Same as `merge`, but not accepts `s.object`.
   * @example
   * const a = s.object({num: s.number()})
   * const c = a.extend({str: s.string()})
   * type C = s.infer<typeof c> // {num: number; str: string}
   */
  extend<const ObjDef extends ObjectDefinition = ObjectDefinition>(
    def: ObjDef
  ): ObjectSchemaBuilder<
    Merge<Input, ObjDef>,
    Prettify<
      Pick<Schema, "type"> &
        Omit<Schema, "properties"> & {
          readonly properties: Schema extends {
            readonly properties: infer Props extends Record<
              string,
              AnySchemaOrAnnotation
            >;
          }
            ? Props & { [P in keyof ObjDef]: ObjDef[P]["schema"] }
            : { [P in keyof ObjDef]: ObjDef[P]["schema"] };
        }
    >,
    Merge<Output, { [K in keyof ObjDef]: ObjDef[K]["_output"] }>
  > {
    const a = object();
    a.schema = Object.assign({}, this.schema) as never;
    const props = (a.schema as ObjectSchema).properties ?? {};
    // biome-ignore lint/complexity/noForEach: <explanation>
    Object.entries(def).forEach(([key, def]) => {
      props[key] = def.schema;
    });
    (a.schema as ObjectSchema).properties = props;
    a.def = { ...this.def, ...def };
    return a as never;
  }

  /**
   * Mark object as `readOnly`. It mostly decoration for typescript.
   *
   * Set `schema.readOnly=true`.
   * @see {@link https://json-schema.org/draft-07/json-schema-validation#rfc.section.10.3 JSON-schema - readOnly keyword}
   */
  // @ts-ignore fix typescript typings
  override readonly(): ObjectSchemaBuilder<
    Input,
    Prettify<
      Pick<Schema, "type"> &
        Omit<Schema, "readOnly"> & {
          readonly readOnly: true;
        }
    >,
    { readonly [P in keyof Output]: Output[P] }
  > {
    return super.readonly() as never;
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
  pick<
    K extends keyof Output & keyof Input,
    const Keys extends readonly K[] = K[]
  >(
    ...keys: Keys
  ): ObjectSchemaBuilder<
    Pick<Input, Keys[number]>,
    Prettify<
      Pick<Schema, "type"> & {
        readonly properties: {
          [P in keyof Pick<Input, Keys[number]>]: Pick<
            Input,
            Keys[number]
          >[P]["schema"];
        };
      } & (Schema extends { readonly required: readonly unknown[] }
          ? ExcludeArr<
              Schema["required"],
              Exclude<keyof Input, Keys[number]>
            > extends readonly never[]
            ? {}
            : {
                readonly required: ExcludeArr<
                  Schema["required"],
                  Exclude<keyof Input, Keys[number]>
                >;
              }
          : {})
    >,
    Pick<Output, Keys[number]>
  > {
    const picked: Record<string, any> = {};
    for (const [k, def] of Object.entries(this.def)) {
      const finded = keys.find((key) => key === k);
      if (finded) {
        picked[k] = def;
      }
    }
    return new ObjectSchemaBuilder(picked) as never;
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
   * const JustTheName = Recipe.omit('name');
   * type JustTheName = s.infer<typeof JustTheName>;
   * // => { id: string; ingredients: string[] }
   */
  omit<K extends keyof Input, const Keys extends readonly K[] = K[]>(
    ...keys: Keys
  ): ObjectSchemaBuilder<
    Omit<Input, Keys[number]>,
    Prettify<
      Pick<Schema, "type"> & {
        readonly properties: {
          [P in keyof Omit<Input, Keys[number]>]: Omit<
            Input,
            Keys[number]
          >[P]["schema"];
        };
      } & (Schema extends { readonly required: readonly unknown[] }
          ? ExcludeArr<
              Schema["required"],
              Keys[number]
            > extends readonly never[]
            ? {}
            : {
                readonly required: ExcludeArr<Schema["required"], Keys[number]>;
              }
          : {})
    >,
    Omit<Output, Keys[number]>
  > {
    for (const k of keys) {
      delete (this.def as any)[k];
    }
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
  keyof<
    const Key extends keyof Input & (string | number) = keyof Input &
      (string | number)
  >() {
    return makeEnum<Key, Key[], UnionToTuple<Key>>(
      Object.keys(this.def) as Key[]
    );
  }
}

// biome-ignore lint/complexity/noBannedTypes: <explanation>
export function object<
  const Definitions extends ObjectDefinition | {} = {}
>(
  def?: Definitions
) {
  return new ObjectSchemaBuilder<Definitions>(def);
}
