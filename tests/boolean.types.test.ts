import { assertType, test } from "vitest";
import { expectTypeOf } from "expect-type";
import s from "../src";

test("boolean default schema", () => {
  const b = s.boolean();
  assertType<{ readonly type: "boolean"; readonly const: undefined }>(b._schema);
  expectTypeOf<typeof b._output>().toEqualTypeOf<boolean>();
});

test("const narrows output", () => {
  const t = s.boolean().const(true);
  assertType<{ readonly type: "boolean"; readonly const: true }>(t._schema);
  expectTypeOf<typeof t._output>().toEqualTypeOf<true>();
});
