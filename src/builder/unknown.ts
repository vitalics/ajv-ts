import type { AnySchema } from "../schema/types";
import { SchemaBuilder } from "./base";

class UnknownSchemaBuilder extends SchemaBuilder<unknown, AnySchema, unknown> {
	constructor() {
		super({} as AnySchema);
	}
}

export function unknown() {
	return new UnknownSchemaBuilder();
}

export default unknown;
