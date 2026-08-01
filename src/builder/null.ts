import type { SetOptional } from "type-fest";
import type { NullSchema } from "../schema/types";
import { SchemaBuilder } from "./base";

export class NullSchemaBuilder<
  const Input = null,
  const Schema extends NullSchema = {
    readonly type: "null";
  }
> extends SchemaBuilder<Input, Schema> {
  constructor(schema?: SetOptional<Schema, "type">) {
    super({ ...schema, type: "null" } as never);
  }
}

export function nil() {
  return new NullSchemaBuilder();
}

export default nil;
