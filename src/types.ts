import { type SchemaObject } from 'ajv'

/**
 * Base schema with internal properties.
 * It also index-based type.
 */
export type BaseSchema = SchemaObject & {
  anyOf?: AnySchemaOrAnnotation[]
  oneOf?: AnySchemaOrAnnotation[]
  type?: string
  $ref?: string
  /**
   * ## New in draft 7
   * The `$comment` keyword is strictly intended for adding comments to a schema.
   * Its value must always be a string. Unlike the annotations {@link BaseSchema.title `title`},
   * {@link BaseSchema.description `description`}, and {@link BaseSchema.examples `examples`},
   * JSON schema implementations aren’t allowed to attach any meaning or behavior to it whatsoever,
   * and may even strip them at any time. Therefore, they are useful for leaving notes to future editors
   * of a JSON schema, but should not be used to communicate to users of the schema.
   * @see {@link https://json-schema.org/understanding-json-schema/reference/generic.html#comments comment}
   */
  $comment?: string
  /**
   * The `title` keyword must be string. A `title` will preferably be short.
   */
  title?: string
  /**
   * The `description` keyword must be string. A {@link BaseSchema.title `title`} will preferably be short,
   * whereas a `description` will provide a more lengthy explanation about
   * the purpose of the data described by the schema.
   *
   */
  description?: string
  default?: unknown
  /**
   * ## New in draft 6
   * The examples keyword is a place to provide an array of examples that validate against the schema.
   * This isn’t used for validation, but may help with explaining the effect and purpose of the schema
   * to a reader. Each entry should validate against the schema in which it resides,
   * but that isn’t strictly required. There is no need to duplicate the default value in the examples array,
   * since default will be treated as another example.
   */
  examples?: unknown[]
  /**
   * ## New in draft 2019-09
   * The `deprecated` keyword is a boolean that indicates that the instance value the keyword applies
   * to should not be used and may be removed in the future.
   */
  deprecated?: boolean
  /**
   * ## New in draft 7
   * The boolean keywords `readOnly` and `writeOnly` are typically used in an API context.
   * `readOnly` indicates that a value should not be modified.
   * It could be used to indicate that a PUT request that changes a value would result in
   * a `400 Bad Request` response.
   */
  readOnly?: boolean
  /**
   * ## New in draft 7
   * The boolean keywords `readOnly` and `writeOnly` are typically used in an API context.
   * `writeOnly` indicates that a value may be set, but will remain hidden.
   * In could be used to indicate you can set a value with a `PUT` request,
   * but it would not be included when retrieving that record with a `GET` request.
   */
  writeOnly?: boolean
}

// TODO: advanced types
/** Schema string pattern */
type Pattern = string

/**
 * There are two numeric types in JSON Schema:
 * {@link https://json-schema.org/understanding-json-schema/reference/numeric.html#id4 `integer`} and
 * {@link https://json-schema.org/understanding-json-schema/reference/numeric.html#number `number`}.
 * They share the same validation keywords.
 *
 * **NOTE:** JSON has no standard way to represent complex numbers, so there is no way to test for them in JSON Schema.
 */
export type NumberSchema = BaseSchema & {
  /**
   * The integer type is used for integral numbers. JSON does not have distinct types for integers and floating-point values.
   * Therefore, the presence or absence of a decimal point is not enough to distinguish between integers and non-integers.
   * For example, `1` and `1.0` are two ways to represent the same value in JSON.
   * JSON Schema considers that value an integer no matter which representation was used.
   *
   * The number type is used for any numeric type, either integers or floating point numbers.
   *
   * @example
   * // integer
   * { "type": "integer" }
   * 42 // good
   * 1.0 // good
   * -1 // good
   * 3.1415926 // bad. Floating point numbers are rejected
   * "14" // bad. Numbers as strings are rejected
   *
   * { "type": "number" }
   * 42 // good
   * -1 // good
   * 2.99792458e8 // good
   * "42" // bad
   * @type {('number' | 'integer')}
   */
  type: 'number' | 'integer'
  /**
   * If `x` is the value being validated, the following must hold true:
   * - x ≥ `minimum`
   * - x > `exclusiveMinimum`
   * - x ≤ `maximum`
   * - x < `exclusiveMaximum`
   *
   * @type {number}
   */
  minimum?: number
  /**
   * If `x` is the value being validated, the following must hold true:
   * - x ≥ `minimum`
   * - x > `exclusiveMinimum`
   * - x ≤ `maximum`
   * - x < `exclusiveMaximum`
   *
   * @type {number}
   */
  maximum?: number
  /**
   * Numbers can be restricted to a multiple of a given number, using the `multipleOf` keyword. It may be set to any positive number.
   * @example
   * // good
   * 0
   * 10
   * 20
   * // Bad
   * 23 // Not a multiple of 10:
   * @type {number}
   */
  multipleOf?: number
  /**
   * If `x` is the value being validated, the following must hold true:
   * - x ≥ `minimum`
   * - x > `exclusiveMinimum`
   * - x ≤ `maximum`
   * - x < `exclusiveMaximum`
   *
   * @type {number}
   */
  exclusiveMaximum?: number | boolean
  /**
   * If `x` is the value being validated, the following must hold true:
   * - x ≥ `minimum`
   * - x > `exclusiveMinimum`
   * - x ≤ `maximum`
   * - x < `exclusiveMaximum`
   *
   * @type {number}
   */
  exclusiveMinimum?: number | boolean
  format?: 'int32' | 'double'
}

/**
 * The `string` type is used for strings of text. It may contain Unicode characters.
 */
export type StringSchema = BaseSchema & {
  type: 'string'
  /**
   * The length of a string can be constrained using the `minLength` and `maxLength` keywords. For both keywords, the value must be a non-negative number.
   *
   * @type {number}
   */
  minLength?: number
  /**
   * The length of a string can be constrained using the `minLength` and `maxLength` keywords. For both keywords, the value must be a non-negative number.
   *
   * @type {number}
   */
  maxLength?: number
  /**
   * Regex pattern
   * @example
   * const mySchema = {
   * "type": "string",
   * "pattern": "^(\\([0-9]{3}\\))?[0-9]{3}-[0-9]{4}$"
   * }
   *
   * validate("555-1212", mySchema) // ok
   * validate("(888)555-1212", mySchema) // ok
   * validate("(888)555-1212 ext. 532", mySchema) // error
   * validate("(800)FLOWERS", mySchema) // error
   *
   * @type {Pattern}
   */
  pattern?: Pattern
  format?:
  | 'date-time'
  | 'time'
  | 'date'
  | 'duration'
  | 'email'
  | 'idn-email'
  | 'hostname'
  | 'idn-hostname'
  | 'ipv4'
  | 'ipv6'
  | 'uuid'
  | 'uri'
  | 'uri-reference'
  | 'iri'
  | 'iri-reference'
  | 'uri-template'
  | 'json-pointer'
  | 'relative-json-pointer'
  | 'regex'
}

/**
 * The boolean type matches only two special values: `true` and `false`.
 *
 * **Note** that values that evaluate to `true` or `false`, such as `1` and `0`, are not accepted by the schema.
 */
export type BooleanSchema = BaseSchema & {
  type: 'boolean'
}

/**
 * When a schema specifies a type of null, it has only one acceptable value: null.
 *
 * **NOTE:** It’s important to remember that in JSON, null isn’t equivalent to something being absent.
 * See {@link https://json-schema.org/understanding-json-schema/reference/object.html#required Required Properties} for an example.
 */
export type NullSchema = BaseSchema & {
  type: 'null'
}

// TODO: improove types
/**
 * Combine schema.
 * @example
 * {type: ['string', 'number']}
 * 123 // OK
 * "Some" // OK
 * {} //error. not matched the type
 */
export type CombinedSchema = BaseSchema & { type: AnySchema['type'][] }

export type EnumAnnotation = {
  enum: (number | string | boolean | null | object)[]
}

export type ConstantAnnotation = {
  const: number | string | boolean | null | object
}

/** Any schema definition */
export type AnySchema =
  | ObjectSchema
  | NumberSchema
  | StringSchema
  | NullSchema
  | BooleanSchema
  | ArraySchema

/**
 * Any Schema and any annotation
 * @see {@link EnumAnnotation}
 * @see {@link ConstantAnnotation}
 */
export type AnySchemaOrAnnotation =
  | AnySchema
  | EnumAnnotation
  | ConstantAnnotation
  | CombinedSchema

type IsNever<T> = T extends never ? true : false

type MaybeReadonlyArray<T> = T[] | readonly T[]

/**
 * Objects are the mapping type in JSON. They map `keys` to `values`. In JSON, the `keys` must always be strings. Each of these pairs is conventionally referred to as a `property`.
 * @see {@link https://json-schema.org/understanding-json-schema/reference/object.html JSON Schema object definition}
 * @todo improve object schema definition for required and additional properties
 */
export type ObjectSchema = BaseSchema & {
  type: 'object'
  /**
   * The `properties` (key-value pairs) on an object are defined using the `properties` keyword.
   * The value of `properties` is an object, where each key is the name of a property and each value
   * is a schema used to validate that property. Any property that doesn’t match any of the property names
   * in the `properties` keyword is ignored by this keyword.
   *
   * **NOTE:** See Additional Properties and Unevaluated Properties for how to disallow properties that don’t match any of the property names in `properties`.
   * @see https://json-schema.org/understanding-json-schema/reference/object.html#properties
   * @example
   * {
   * type: "object",
   * properties: {
   *   number: { "type": "number" },
   *   street_name: { "type": "string" },
   *   street_type: { "enum": ["Street", "Avenue", "Boulevard"] }
   * }
   * }
   * { "number": 1600, "street_name": "Pennsylvania", "street_type": "Avenue" } // good
   * { "number": "1600", "street_name": "Pennsylvania", "street_type": "Avenue" } // error: number in wrong format
   * { } // valid
   * { "number": 1600, "street_name": "Pennsylvania", "street_type": "Avenue", "direction": "NW" } // valid for additional properties
   */
  properties?: Record<string, AnySchemaOrAnnotation>
  /**
   * Sometimes you want to say that, given a particular kind of property name, the value should match
   * a particular schema. That’s where patternProperties comes in: it maps regular expressions to schemas.
   * If a property name matches the given regular expression, the property value must validate against the corresponding schema.
   *
   * **NOTE:** Regular expressions are not anchored. This means that when defining the regular expressions for `patternProperties`,
   * it’s important to note that the expression may match anywhere within the property name.
   * For example, the regular expression `p` will match any property name with a p in it, such as `apple`,
   * not just a property whose name is simply `p`. It’s therefore usually less confusing to surround the regular expression in
   * `^...$`, for example, `^p$`.
   * @example
   * {
   * "type": "object",
   * "patternProperties": {
   *   "^S_": { "type": "string" },
   *   "^I_": { "type": "integer" }
   * }
   * }
   * { "S_25": "This is a string" } // good
   * { "I_0": 42 } // valid
   * { "S_0": 42 } // error: name starts with S_, it must be a string
   * { "I_42": "This is a string" } // error: the name starts with I_, it must be an integer
   */
  patternProperties?: Record<Pattern, AnySchemaOrAnnotation>
  /**
   * The additionalProperties keyword is used to control the handling of extra stuff, that is,
   * properties whose names are not listed in the properties keyword or match any of
   * the regular expressions in the patternProperties keyword. By default any additional properties are allowed.
   * The value of the additionalProperties keyword is a schema that will be used to validate any properties
   * in the instance that are not matched by properties or patternProperties.
   * Setting the additionalProperties schema to false means no additional properties will be allowed.
   * @see {@link ObjectSchema.properties}
   * @see {@link https://json-schema.org/understanding-json-schema/reference/object.html}
   * @example
   * {
   * "type": "object",
   * "properties": {
   *   "number": { "type": "number" },
   * },
   * "additionalProperties": false
   * }
   * { "number": 1600, } // ok
   * { "number": 1600,"direction": "NW" } // error. Since `additionalProperties` is false, this extra property “direction” makes the object invalid
   */
  additionalProperties?: boolean | AnySchemaOrAnnotation
  /**
   * By default, the properties defined by the properties keyword are not required.
   * However, one can provide a list of required properties using the required keyword.
   * The required keyword takes an array of zero or more strings. Each of these strings must be unique.
   */
  required?: MaybeReadonlyArray<string>
  unevaluatedProperties?: boolean
  /**
   * ## New in draft 6
   * The names of properties can be validated against a schema, irrespective of their values.
   * This can be useful if you don’t want to enforce specific properties,
   * but you want to make sure that the names of those properties follow a specific convention.
   * You might, for example, want to enforce that all names are valid ASCII tokens so they can be
   * used as attributes in a particular programming language.
   * @since draft 6
   * @example
   * {
   * "type": "object",
   * "propertyNames": {
   *   "pattern": "^[A-Za-z_][A-Za-z0-9_]*$"
   * }
   * }
   * //usage
   * { "_a_proper_token_001": "value" } // ok
   * { "001 invalid": "value"} // error. not matched the pattern
   */
  propertyNames?: {
    pattern: Pattern
  }
  nullable?: boolean
  minProperties?: number
  maxProperties?: number
}
/**
 * Arrays are used for ordered elements. In JSON, each element in an array may be of a different type.
 * @see {@link https://json-schema.org/understanding-json-schema/reference/array.html}
 * @todo improve complex type e.g. `(string|number)[]`
 */
export type ArraySchema = BaseSchema & {
  type: 'array'
  uniqueItems?: boolean
  items?: boolean | AnySchemaOrAnnotation | AnySchemaOrAnnotation[]
  minItems?: number
  maxItems?: number
  prefixItems?: AnySchemaOrAnnotation[]
  contains?: AnySchemaOrAnnotation
  minContains?: number
  maxContains?: number
}
