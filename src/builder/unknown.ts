import { SchemaBuilder } from "./base";
import type { AnySchema } from "../schema/types";

class UnknownSchemaBuilder extends SchemaBuilder<unknown, AnySchema, unknown> {
  constructor() {
    super({} as AnySchema);
  }
}

export function unknown() {
  return new UnknownSchemaBuilder();
}

export default unknown;
