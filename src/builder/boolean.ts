import { SetOptional } from "type-fest";

import { BooleanSchema } from "../schema/types";
import { Prettify } from "../types/object";
import { SchemaBuilder } from "./base";

class BooleanSchemaBuilder<
  const Input extends boolean,
  const Schema extends BooleanSchema = {
    readonly type: "boolean";
    readonly const: undefined;
  },
> extends SchemaBuilder<boolean, Schema, Input> {
  constructor(schema?: SetOptional<Schema, "type">) {
    super({ ...schema, type: "boolean" } as never);
  }

  const<const V extends boolean>(
    value: V,
  ): BooleanSchemaBuilder<
    V,
    Prettify<
      Pick<Schema, "type"> &
        Omit<Schema, "const"> & {
          readonly const: V;
        }
    >
  > {
    (this.schema as Record<string, unknown>).const = value;
    return this as never;
  }
}

export function bool() {
  return new BooleanSchemaBuilder();
}

export default bool;
