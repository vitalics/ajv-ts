import type { ConstantAnnotation } from "../schema/types";
import { SchemaBuilder } from "./base";

export class ConstantSchemaBuilder<
	const Value extends string | number | boolean | null | object,
> extends SchemaBuilder<
	Value,
	ConstantAnnotation & { readonly const: Value },
	Value
> {
	constructor(value: Value) {
		super({ const: value } as never);
	}
}

export function constant<
	const Value extends string | number | boolean | null | object,
>(value: Value) {
	return new ConstantSchemaBuilder(value);
}

export { constant as literal };
