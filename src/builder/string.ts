import type {
	GreaterThan,
	GreaterThanOrEqual,
	IsStringLiteral,
	SetOptional,
} from "type-fest";
import type { StringSchema } from "../schema/types";
import { ArraySchemaBuilder } from "./array";
import { array } from "./array";
import { type AnySchemaBuilder, SchemaBuilder } from "./base";

import type { TRangeError, TTypeError } from "../types/errors";
import type { IsPositiveInteger } from "../types/number";
import type { OmitMany, Prettify } from "../types/object";
import type { OmitUndefined } from "../types/object";

type StringFormat = StringSchema["format"];

type StringSchemaOpts = {
	readonly minLength: number | undefined;
	readonly maxLength: number | undefined;
};

type DefaultStringOpts = {
	readonly minLength: undefined;
	readonly maxLength: undefined;
};

class StringSchemaBuilder<
	const Input extends string = string,
	const Schema extends StringSchema = Prettify<
		OmitUndefined<{
			readonly type: "string";
			readonly format: undefined;
			readonly minLength: undefined;
			readonly maxLength: undefined;
			readonly pattern: undefined;
			readonly const: undefined;
		}>
	>,
	const Opts extends StringSchemaOpts = DefaultStringOpts,
> extends SchemaBuilder<string, Schema, Input> {
	constructor(schema?: SetOptional<Schema, "type">) {
		super({ ...schema, type: "string" } as never);
	}

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
	 * - `+?`, `*?`, `??`: The *, +, and ? qualifiers are all greedy; they match as much text as possible. Sometimes this behavior is not desired and you want to match as few characters as possible.
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
	pattern<const Pattern extends string | RegExp = string | RegExp>(
		pattern: Pattern,
	): StringSchemaBuilder<
		Input,
		Prettify<
			Pick<Schema, "type"> &
				OmitUndefined<Omit<Schema, "pattern"> & { readonly pattern: Pattern }>
		>,
		Opts
	> {
		if (typeof pattern === "string") {
			this.schema.pattern = pattern;
		} else if (pattern instanceof RegExp) {
			this.schema.pattern = pattern.source;
		}
		return this as never;
	}

	const<const V extends string>(
		value: V,
	): StringSchemaBuilder<
		V,
		Prettify<
			Pick<Schema, "type"> &
				OmitUndefined<Omit<Schema, "const"> & { readonly const: V }>
		>,
		Opts
	> {
		(this.schema as Record<string, unknown>).const = value;
		return this as never;
	}

	/**
	 * Exclude a specific constant value from the string schema.
	 * @example
	 * const res = s.string().exclude(s.const('Jerry'))
	 * res.schema // { type: 'string', not: { const: 'Jerry' } }
	 */
	exclude<const S extends AnySchemaBuilder>(
		schema: S,
	): StringSchemaBuilder<
		Exclude<Input, S["_output"]>,
		Prettify<
			Pick<Schema, "type"> &
				Omit<Schema, "not"> & {
					readonly not: S["_schema"];
				}
		>,
		Opts
	> {
		(this.schema as Record<string, unknown>).not = schema.schema;
		return this as never;
	}

	/**
	 * Define minimum string length.
	 *
	 * Same as `min` method
	 * @see {@link min min} method
	 */
	minLength<
		const L extends number,
		Valid = IsPositiveInteger<L>,
		MinLengthValid = Opts["maxLength"] extends number
			? GreaterThan<Opts["maxLength"], L>
			: true,
	>(
		value: Valid extends true
			? MinLengthValid extends true
				? L
				: TRangeError<`MinLength are greater than MaxLength. MinLength: ${L}. MaxLength: ${Opts["maxLength"]}`>
			: TTypeError<`Only Positive and non floating numbers are supported. Received: '${L}'`>,
	): StringSchemaBuilder<
		Input,
		Prettify<
			Pick<Schema, "type"> &
				OmitUndefined<
					Omit<Schema, "minLength"> & {
						readonly minLength: L;
					}
				>
		>,
		Prettify<Omit<Opts, "minLength"> & { readonly minLength: L }>
	> {
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
	 * @see {@link max max} method
	 */
	maxLength<
		const L extends number,
		Valid = IsPositiveInteger<L>,
		MinLengthValid = Opts["minLength"] extends number
			? GreaterThan<L, Opts["minLength"]>
			: true,
	>(
		value: Valid extends true
			? MinLengthValid extends true
				? L
				: TRangeError<`MinLength are greater than MaxLength. MinLength: ${Opts["minLength"]}. MaxLength: ${L}`>
			: TTypeError<`Expected positive integer. Received: '${L}'`>,
	): StringSchemaBuilder<
		Input,
		Prettify<
			Pick<Schema, "type"> &
				OmitUndefined<
					Omit<Schema, "maxLength"> & {
						readonly maxLength: L;
					}
				>
		>,
		Prettify<Omit<Opts, "maxLength"> & { readonly maxLength: L }>
	> {
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
	length<const L extends number, Valid = IsPositiveInteger<L>>(
		value: Valid extends true
			? L
			: TTypeError<`Expected positive integer. Received: '${L}'`>,
	): StringSchemaBuilder<
		Input,
		Prettify<
			Pick<Schema, "type"> &
				OmitUndefined<
					OmitMany<Schema, ["minLength", "maxLength"]> & {
						readonly minLength: L;
						readonly maxLength: L;
					}
				>
		>,
		Prettify<
			Omit<Opts, "minLength" | "maxLength"> & {
				readonly minLength: L;
				readonly maxLength: L;
			}
		>
	> {
		return this.maxLength<L>(value as never).minLength<L>(
			value as never,
		) as never;
	}
	/**
	 * Define non empty string. Same as `minLength(1)`
	 */
	nonEmpty(): StringSchemaBuilder<
		Input,
		Prettify<
			Pick<Schema, "type"> &
				OmitUndefined<
					Omit<Schema, "minLength"> & {
						readonly minLength: 1;
					}
				>
		>,
		Prettify<Omit<Opts, "minLength"> & { readonly minLength: 1 }>
	> {
		return this.minLength(1 as never) as never;
	}

	/**
	 * A string is valid against this format if it represents a valid e-mail address format.
	 *
	 * Example: `some@gmail.com`
	 */
	email() {
		return this.format("email");
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
	uuid() {
		return this.format<`${string}-${string}-${string}-${string}-${string}`>(
			"uuid",
		);
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
		return this.format<`${string}T${string}Z`>("date-time");
	}

	/**
	 * A string is valid against this format if it represents a valid regular expression.
	 *
	 * Same as `s.string().format('regex')`
	 */
	regex() {
		return this.format("regex");
	}

	format<
		const S extends string = Input,
		const Format extends StringFormat = StringFormat,
	>(
		format: Format,
	): StringSchemaBuilder<
		S,
		Prettify<
			Pick<Schema, "type"> &
				OmitUndefined<
					Omit<Schema, "format"> & {
						readonly format: Format;
					}
				>
		>,
		Opts
	> {
		this.schema.format = format;
		return this as never;
	}

	/**
	 * Construct Array schema from current string schema.
	 * Same as `s.array(s.string())`.
	 */
	array(): ArraySchemaBuilder<this["_schema"]> {
		return new ArraySchemaBuilder(this.schema);
	}
}

export function string<const S extends string>() {
	return new StringSchemaBuilder<S>();
}
