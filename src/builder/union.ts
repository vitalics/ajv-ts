import type { CombinedSchema } from "../schema/types";
import { type AnySchemaBuilder, type Infer, SchemaBuilder } from "./base";

class UnionSchemaBuilder<
  const El extends AnySchemaBuilder = AnySchemaBuilder,
  const S extends readonly El[] = readonly El[],
  const Schema extends CombinedSchema = {
    readonly anyOf: S[number]["schema"];
    readonly type: S[number]["schema"]["type"];
  }
> extends SchemaBuilder<Infer<El>, Schema, Infer<S[number]>> {
  constructor(...schemas: S) {
    const types = [
      ...new Set(
        schemas
          .map((s) => s.schema.type)
          .filter((t): t is string => typeof t === "string")
      ),
    ];
    const schema: Record<string, unknown> = {
      anyOf: schemas.map((s) => s.schema),
    };
    if (types.length > 0) {
      schema.type = types;
    }
    super(schema as Schema);
  }
}

export function or<
  const El extends AnySchemaBuilder = AnySchemaBuilder,
  const S extends readonly El[] = readonly El[]
>(...defs: S) {
  return new UnionSchemaBuilder<El, S>(...defs);
}

export const union = or;
