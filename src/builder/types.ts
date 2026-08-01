import type { AnySchemaBuilder } from "./base";

/**
 * infers `output` type from given schema builder
 */
export type InferOutputType<T extends Pick<AnySchemaBuilder, "_output">> =
	T["_output"];

export type InferSchemaType<T extends Pick<AnySchemaBuilder, "schema">> =
	T["schema"];
