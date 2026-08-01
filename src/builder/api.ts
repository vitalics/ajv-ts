import Ajv from "ajv";

import { array } from "./array";
import { type AnySchemaBuilder, SchemaBuilder } from "./base";
import { bool } from "./boolean";
import { constant, literal } from "./constant";
import { makeEnum } from "./enum";
import { never, not } from "./not";
import { nil } from "./null";
import { int, integer, number } from "./number";
import { object } from "./object";
import { string } from "./string";
import { or } from "./union";

import type { AnySchemaOrAnnotation } from "../schema/types";
import type { InferOutputType, InferSchemaType } from "./types";

class UnknownSchemaBuilder<T extends unknown | any> extends SchemaBuilder<
	T,
	AnySchemaOrAnnotation
> {
	constructor(schema?: AnySchemaOrAnnotation) {
		super((schema ?? {}) as AnySchemaOrAnnotation);
	}
}

function withAjv<B extends AnySchemaBuilder>(builder: B, ajv: Ajv): B {
	builder.ajv = ajv;
	return builder;
}

function any(): SchemaBuilder<any, AnySchemaOrAnnotation, any> {
	return new UnknownSchemaBuilder();
}

function unknown(): SchemaBuilder<unknown, AnySchemaOrAnnotation, unknown> {
	return new UnknownSchemaBuilder<unknown>();
}

function fromJSON(
	schema: AnySchemaOrAnnotation,
	defaults?: AnySchemaBuilder,
): AnySchemaBuilder {
	const merged = defaults
		? { ...(defaults.schema as object), ...(schema as object) }
		: schema;
	return new UnknownSchemaBuilder(
		merged as AnySchemaOrAnnotation,
	) as AnySchemaBuilder;
}

type Api = {
	any: () => AnySchemaBuilder;
	array: (...args: Parameters<typeof array>) => AnySchemaBuilder;
	bool: () => AnySchemaBuilder;
	boolean: () => AnySchemaBuilder;
	null: () => AnySchemaBuilder;
	int: () => AnySchemaBuilder;
	integer: () => AnySchemaBuilder;
	number: () => AnySchemaBuilder;
	object: (def?: Parameters<typeof object>[0]) => AnySchemaBuilder;
	or: (...args: Parameters<typeof or>) => AnySchemaBuilder;
	union: (...args: Parameters<typeof or>) => AnySchemaBuilder;
	string: () => AnySchemaBuilder;
	unknown: () => AnySchemaBuilder;
	enum: (...args: Parameters<typeof makeEnum>) => AnySchemaBuilder;
	const: (value: Parameters<typeof constant>[0]) => AnySchemaBuilder;
	literal: (value: Parameters<typeof literal>[0]) => AnySchemaBuilder;
	never: () => AnySchemaBuilder;
	not: (schema: Parameters<typeof not>[0]) => AnySchemaBuilder;
	fromJSON: (schema: AnySchemaOrAnnotation) => AnySchemaBuilder;
};

type StaticApi = Api & {
	create: (ajv: Ajv) => Api;
	keyof: <const T extends AnySchemaBuilder>(schema: T) => AnySchemaBuilder;
};

function create(ajv: Ajv): Api {
	return {
		any: () => withAjv(any(), ajv),
		array: (...args: Parameters<typeof array>) => withAjv(array(...args), ajv),
		bool: () => withAjv(bool(), ajv),
		boolean: () => withAjv(bool(), ajv),
		null: () => withAjv(nil(), ajv),
		int: () => withAjv(int(), ajv),
		integer: () => withAjv(integer(), ajv),
		number: () => withAjv(number(), ajv),
		object: (def?: Parameters<typeof object>[0]) =>
			withAjv(object(def as never), ajv),
		or: (...args: Parameters<typeof or>) =>
			withAjv(or(...args) as unknown as AnySchemaBuilder, ajv),
		union: (...args: Parameters<typeof or>) =>
			withAjv(or(...args) as unknown as AnySchemaBuilder, ajv),
		string: () => withAjv(string(), ajv),
		unknown: () => withAjv(unknown(), ajv),
		enum: (...args: Parameters<typeof makeEnum>) =>
			withAjv(makeEnum(...args) as unknown as AnySchemaBuilder, ajv),
		const: (value: Parameters<typeof constant>[0]) =>
			withAjv(constant(value), ajv),
		literal: (value: Parameters<typeof literal>[0]) =>
			withAjv(literal(value), ajv),
		never: () => withAjv(never() as unknown as AnySchemaBuilder, ajv),
		not: (schema: Parameters<typeof not>[0]) =>
			withAjv(not(schema) as unknown as AnySchemaBuilder, ajv),
		fromJSON: (schema: AnySchemaOrAnnotation) => withAjv(fromJSON(schema), ajv),
	};
}

function keyof<const T extends AnySchemaBuilder>(schema: T): AnySchemaBuilder {
	if (schema.schema.type !== "object") {
		throw new TypeError("keyof only supports object schemas");
	}
	const properties =
		(schema.schema as { properties?: Record<string, unknown> }).properties ??
		{};
	const keys = Object.keys(properties);
	return or(...keys.map((k) => constant(k)));
}

export {
	any,
	array,
	bool,
	bool as boolean,
	int,
	integer,
	nil as null,
	number,
	object,
	or,
	or as union,
	string,
	unknown,
	makeEnum as enum,
	SchemaBuilder,
	constant,
	constant as const,
	literal,
	never,
	not,
	fromJSON,
	create,
	keyof,
	type InferSchemaType,
	type InferOutputType,
	type InferOutputType as infer,
	type InferOutputType as input,
};

const api: StaticApi = {
	any,
	array,
	bool,
	boolean: bool,
	null: nil,
	int,
	number,
	integer,
	or,
	union: or,
	object,
	string,
	unknown,
	enum: makeEnum,
	const: constant,
	literal,
	never,
	not,
	fromJSON,
	create,
	keyof,
};

export default api;
