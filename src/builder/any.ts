import { SchemaBuilder } from "./base";
import type { AnySchema } from "../schema/types";

class AnySchemaBuilder extends SchemaBuilder<any, AnySchema, any> {
  constructor() {
    super({} as AnySchema);
  }
}

export function any() {
  return new AnySchemaBuilder();
}

export default any;
