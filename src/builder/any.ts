import type { AnySchema } from "../schema/types";
import { SchemaBuilder } from "./base";

class AnySchemaBuilder extends SchemaBuilder<any, AnySchema, any> {
  constructor() {
    super({} as AnySchema);
  }
}

export function any() {
  return new AnySchemaBuilder();
}

export default any;
