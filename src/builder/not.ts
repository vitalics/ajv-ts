import type { AnySchemaOrAnnotation } from "../schema/types";
import { type AnySchemaBuilder, SchemaBuilder } from "./base";

export class NotSchemaBuilder<Input, Output> extends SchemaBuilder<
	Input,
	AnySchemaOrAnnotation,
	Output
> {}

export function not<const S extends AnySchemaBuilder>(
	schema: S,
): NotSchemaBuilder<unknown, Exclude<unknown, S["_output"]>> {
	return new NotSchemaBuilder({
		not: schema.schema,
	} as never) as never;
}

export function never(): NotSchemaBuilder<never, never> {
	return new NotSchemaBuilder({ not: {} } as never) as never;
}
