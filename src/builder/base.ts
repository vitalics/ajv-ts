import type { StandardSchemaV1 } from "@standard-schema/spec";
import Ajv, { type ErrorObject } from "ajv";
import ajvErrors from "ajv-errors";
import addFormats from "ajv-formats";

import type { AnySchema, AnySchemaOrAnnotation } from "../schema/types";
import type { TError } from "../types/errors";

export type SafeParseResult<T, E extends Error | TError | string = Error> =
	| SafeParseSuccessResult<T>
	| SafeParseErrorResult<T, E>;

export type SafeParseSuccessResult<T> = {
	success: true;
	data: T;
	/** `undefined` for success result */
	error?: Error;
};
export type SafeParseErrorResult<
	T,
	E extends Error | TError | string = Error,
> = {
	success: false;
	error: E;
	/** `undefined` for error result */
	data?: T;
};

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
		} as never) as never,
	) as never,
);

export type AnySchemaBuilder = SchemaBuilder<any, any, any>;

/**
 * Converts `safeParse` error into [standard schema](https://standardschema.dev) issues.
 *
 * Ajv errors (`error.cause`) are mapped one-to-one, `instancePath` (JSON-pointer) becomes `path` segments.
 * Non-ajv errors (e.g. schema compilation errors) are mapped into a single issue without `path`.
 */
function toStandardIssues(error: Error): StandardSchemaV1.Issue[] {
	if (Array.isArray(error.cause)) {
		return (error.cause as ErrorObject[]).map((issue) => {
			const path =
				typeof issue.instancePath === "string" && issue.instancePath.length > 0
					? issue.instancePath
							.slice(1)
							.split("/")
							// unescape JSON-pointer segments (RFC 6901)
							.map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"))
					: undefined;
			return { message: issue.message ?? error.message, path };
		});
	}
	return [{ message: error.message }];
}

export abstract class SchemaBuilder<
	const Input,
	const Schema extends AnySchemaOrAnnotation = AnySchemaOrAnnotation,
	const Output = Input,
> {
	declare _input: Input;
	declare _output: Output;
	declare _schema: Schema;

	private _preFns: ((value: unknown) => unknown)[] = [];
	private _postFns: ((value: unknown) => unknown)[] = [];
	private _refineFns: ((value: unknown) => unknown)[] = [];

	constructor(
		schema: Schema,
		private _ajv: Ajv = DEFAULT_AJV,
	) {
		this._schema = schema;
	}

	/**
	 * [Standard schema](https://standardschema.dev) properties.
	 *
	 * Makes any schema builder compatible with tools that accept `StandardSchemaV1`
	 * (form validators, tRPC, etc.) without library-specific adapters.
	 * @example
	 * import type { StandardSchemaV1 } from "@standard-schema/spec";
	 *
	 * const schema = s.object({ name: s.string() });
	 * const standard: StandardSchemaV1 = schema; // OK
	 * standard["~standard"].validate({ name: "John" }); // { value: { name: "John" } }
	 */
	readonly "~standard": StandardSchemaV1.Props<Output, Output> = {
		version: 1,
		vendor: "ajv-ts",
		validate: (value) => this._standardValidate(value),
	};

	/**
	 * `StandardSchemaV1` `validate` implementation. Uses {@link SchemaBuilder.safeParse safeParse} under the hood.
	 * @see {@link https://standardschema.dev standard schema spec}
	 */
	private _standardValidate(value: unknown): StandardSchemaV1.Result<Output> {
		const result = this.safeParse(value);
		if (result.success) {
			return { value: result.data };
		}
		return { issues: toStandardIssues(result.error) };
	}

	set schema(schema) {
		this._schema = schema;
	}
	get schema() {
		return this._schema;
	}
	/**
	 * Returns the Ajv instance used by this builder.
	 */
	get ajv() {
		return this._ajv;
	}
	set ajv(value: Ajv) {
		this._ajv = value;
	}
	/**
	 * Returns JSON-schema representation. Same as `schema`.
	 */
	get shape() {
		return this._schema;
	}
	set shape(value: Schema) {
		this._schema = value;
	}

	/**
	 * # 2020-12 Draft 6
	 * The `examples` keyword is a place to provide an array of examples that validate against the schema.
	 * This isn’t used for validation, but may help with explaining the effect and purpose of the schema
	 * to a reader. Each entry should validate against the schema in which it resides,
	 * but that isn’t strictly required. There is no need to duplicate the default value in the examples array,
	 * since default will be treated as another example.
	 *
	 * **Note:** While it is recommended that the examples validate against the subschema they are defined in, this requirement is not strictly enforced.
	 * - Used to demonstrate how data should conform to the schema.
	 * - `examples` does not affect data validation but serves as an informative annotation.
	 * @see {@link https://www.learnjsonschema.com/2020-12/meta-data/examples JSON-schema examples definition}
	 * @example
	 * s.string().examples(["str1", 'string 2']) // OK
	 * s.number().examples(["str1", 'string 2']) // Error in Typescript, schema is OK
	 * s.number().examples([1, 2, 3]) // OK
	 * s.number().examples(1, 2, 3) // OK
	 */
	examples<
		const T = Output,
		const Examples extends readonly unknown[] = readonly T[],
	>(
		...examples: Examples
	): SchemaBuilder<Input, Schema & { readonly examples: Examples }, Output> {
		const normalized: readonly unknown[] =
			examples.length === 1 && Array.isArray(examples[0])
				? (examples[0] as readonly unknown[])
				: examples;
		(this.schema as Record<string, unknown>).examples = normalized;
		return this as never;
	}

	/**
	 * Adds meta information fields to the schema (description, deprecated, examples, etc.)
	 */
	meta(obj: Record<string, unknown>): this {
		Object.entries(obj).forEach(([key, value]) => {
			if (key === "examples") {
				this.examples(...(Array.isArray(value) ? value : [value]));
			} else {
				(this.schema as Record<string, unknown>)[key] = value;
			}
		});
		return this;
	}

	/**
	 * Preprocess the input value before validation.
	 */
	preprocess(fn: (value: unknown) => unknown): this {
		if (typeof fn !== "function") {
			throw new TypeError("preprocess must be a function");
		}
		this._preFns.push(fn);
		return this;
	}

	/**
	 * Postprocess the validated output value.
	 */
	postprocess(
		fn: (value: Output) => unknown,
		_schema?: AnySchemaBuilder,
	): this {
		if (typeof fn !== "function") {
			throw new TypeError("postprocess must be a function");
		}
		this._postFns.push(fn as (value: unknown) => unknown);
		return this;
	}

	/**
	 * Add a refinement function that runs after validation.
	 */
	refine(fn: (value: Output) => unknown): this {
		if (typeof fn !== "function") {
			throw new TypeError("refine must be a function");
		}
		this._refineFns.push(fn as (value: unknown) => unknown);
		return this;
	}

	/**
	 * Mark schema as async (`$async=true`).
	 */
	async(): this {
		(this.schema as Record<string, unknown>).$async = true;
		return this;
	}

	/**
	 * Mark schema as sync (`$async=false`).
	 */
	sync(remove: boolean = false): this {
		(this.schema as Record<string, unknown>).$async = false;
		if (remove) {
			delete (this.schema as Record<string, unknown>).$async;
		}
		return this;
	}

	/**
	 * Defines custom error message for invalid schema.
	 *
	 * Set `schema.errorMessage = message` under the hood.
	 * @example
	 * const numberSchema = s.number().error('Not a number')
	 * numberSchema.parse('qwe') // error: Not a number
	 */
	error(
		messageOrOptions: string | Record<string, unknown>,
	): SchemaBuilder<
		Input,
		Schema & { readonly errorMessage: typeof messageOrOptions },
		Output
	> {
		(this.schema as Record<string, unknown>).errorMessage = messageOrOptions;
		return this as never;
	}

	readonly(): SchemaBuilder<
		Input,
		Schema & { readonly readOnly: true },
		Output
	> {
		(this.schema as AnySchema).readOnly = true;
		return this as never;
	}

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
	custom<const K extends string, const V = unknown>(
		key: K,
		value: V,
	): this & SchemaBuilder<Input, Schema & Record<K, V>, Output> {
		(this.schema as Record<string, unknown>)[key] = value;
		return this as never;
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
	default<const T extends Output = Output>(
		value: T,
	): SchemaBuilder<
		Input,
		Schema & {
			readonly default: T;
		},
		T
	> {
		(this.schema as AnySchema).default = value;
		return this as never;
	}

	// meta<
	//   const Props extends {
	//     readonly description?: string;
	//     readonly $async?: boolean;
	//     readonly examples?: Output;
	//     readonly title?: string;
	//     readonly deprecated?: boolean;
	//     readonly comment?: string;
	//     readonly readOnly?: boolean;
	//     readonly writeOnly?: boolean;
	//     readonly default?: Output;
	//   }
	// >(
	//   properties: Props
	// ): SchemaBuilder<Input, Omit<Schema, keyof Props> & Props, Output> {
	//   Object.entries(properties).forEach(([key, value]) => {
	//     if (key === "readonly") {
	//       return this.custom("readOnly", value);
	//     }
	//     if (key === "default") {
	//       return this.custom("default", value);
	//     }
	//     if (key === "writeonly") {
	//       return this.custom("writeOnly", value);
	//     }
	//     if (key === "async") {
	//       return this.custom("$async", value);
	//     }
	//     if (key === "examples") {
	//       return this.examples(value as never);
	//     }
	//     return this.custom(key, value);
	//   });
	//   return this as never;
	// }

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
	/**
	 * Negate the current schema.
	 */
	not(): NotSchemaBuilder<unknown, Output> {
		return new NotSchemaBuilder({ not: this.schema } as never) as never;
	}

	nullable(): SchemaBuilder<Input, Schema, Output | null> {
		// same as `or(this, nil())`, but defined inline to avoid circular imports
		// (`null`/`union` builders extend `SchemaBuilder` from this module)
		const current = this.schema as AnySchemaOrAnnotation;
		const currentType = (current as AnySchema).type;

		let nextType: string | string[] | undefined;
		if (Array.isArray(currentType)) {
			nextType = [...new Set([...currentType, "null"])];
		} else if (typeof currentType === "string") {
			nextType = [...new Set([currentType, "null"])];
		} else if (
			"enum" in current &&
			Array.isArray((current as { enum?: unknown }).enum)
		) {
			const enumTypes = new Set<string>();
			for (const value of (
				current as { enum: (string | number | boolean | object)[] }
			).enum) {
				if (typeof value === "string") enumTypes.add("string");
				else if (typeof value === "number") enumTypes.add("number");
				else if (typeof value === "boolean") enumTypes.add("boolean");
			}
			nextType = [...enumTypes, "null"];
		}

		return new NullableSchemaBuilder({
			anyOf: [this.schema, { type: "null" }],
			...(nextType !== undefined ? { type: nextType } : {}),
		} as never) as never;
	}

	/** marks schema as `deprecated:true` property */
	deprecated(): SchemaBuilder<
		Input,
		Schema & { readonly deprecated: true },
		Output
	> {
		(this.schema as any).deprecated = true;
		return this as never;
	}

	protected _safeParseRaw(input?: unknown): SafeParseResult<unknown> {
		let success = false;
		try {
			const validateFn = this._ajv.compile(this.schema);
			success = validateFn(input);
			if (!success) {
				const firstError = validateFn.errors?.at(0);
				return {
					error: new Error(firstError?.message, {
						cause: validateFn.errors,
					}),
					success,
					data: undefined,
				};
			}
		} catch (e) {
			return {
				error: new Error((e as Error).message, { cause: e }),
				success: false,
				data: undefined,
			};
		}
		return {
			data: input,
			success,
		};
	}

	/**
	 * Parse you input result. Used `ajv.validate` under the hood
	 *
	 * It also applies your `postProcess` functions if parsing was successfull
	 */
	safeParse(input?: unknown): SafeParseResult<Output> {
		let value: unknown = input;
		for (const fn of this._preFns) {
			value = fn(value);
		}

		const result = this._safeParseRaw(value);
		if (!result.success) {
			return result as SafeParseResult<Output>;
		}

		let data: any = result.data;
		for (const fn of this._postFns) {
			data = fn(data);
		}

		for (const fn of this._refineFns) {
			try {
				const res = fn(data);
				if (res !== undefined) {
					return {
						success: false,
						error: new Error("refine error", { cause: res }),
						data: undefined,
					} as SafeParseResult<Output>;
				}
			} catch (e) {
				return {
					success: false,
					error: e instanceof Error ? e : new Error(String(e)),
					data: undefined,
				} as SafeParseResult<Output>;
			}
		}

		return { success: true, data } as SafeParseResult<Output>;
	}
	/**
	 * Parse input for given schema.
	 *
	 * @returns {Output} parsed output result.
	 * @throws `Error` when input not match given schema
	 */
	parse(input?: unknown): Output {
		const parsed = this.safeParse(input);
		if (parsed.success) {
			return parsed.data as never;
		}
		throw parsed.error;
	}
	/**
	 * Validate your schema.
	 *
	 * @returns {boolean} Validity of your schema
	 */
	validate(input?: unknown): boolean {
		const parsed = this.safeParse(input);
		return parsed.success as never;
	}
}

/**
 * Concrete schema builder produced by {@link SchemaBuilder.nullable nullable} method.
 *
 * Defined locally (instead of reusing `UnionSchemaBuilder`) to avoid circular
 * imports: `null`/`union` builders extend `SchemaBuilder` from this module.
 */
class NullableSchemaBuilder<
	const Input,
	const Schema extends AnySchemaOrAnnotation,
	const Output,
> extends SchemaBuilder<Input, Schema, Output> {}

/**
 * Concrete schema builder produced by {@link SchemaBuilder.not not} method.
 */
export class NotSchemaBuilder<const Input, const Output> extends SchemaBuilder<
	Input,
	AnySchemaOrAnnotation,
	Output
> {}

export type Infer<S extends AnySchemaBuilder> = S["_output"];
export type GetSchema<S extends AnySchemaBuilder> = S["_schema"];

export type SchemaToBuilder<
	Sb extends AnySchemaBuilder,
	S extends AnySchemaOrAnnotation = GetSchema<Sb>,
> = unknown;

type SchemaObjectToType<S extends AnySchemaOrAnnotation> = S extends {
	type: "number" | "string" | "null";
}
	? S["type"] extends number
		? number
		: S["type"] extends "string"
			? string
			: S["type"] extends "null"
				? null
				: // S['type'] extends 'object' ? Record<any, any> :
					// S extends { type: 'array' }? :
					S extends {
							type: "object";
							properties?: Record<string, AnySchemaOrAnnotation>;
						}
					? S["properties"][keyof S["properties"]]
					: [unknown, "not matched"]
	: [unknown, "end"];
// export type SchemaToType<
//   Sb extends AnySchemaBuilder,
//   S extends AnySchemaOrAnnotation = GetSchema<Sb>
// > = S extends { type: "number" | "string" | "null" | "object" | "array" }
//   ? S["type"] extends number
//     ? number
//     : S["type"]
//   : any;
type T = SchemaObjectToType<{ type: "number" }>;
