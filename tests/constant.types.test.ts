import { assertType, test } from "vitest";
import { expectTypeOf } from "expect-type";
import s from "../src";

test("const produces a constant annotation", () => {
  const c = s.const("hello");
  assertType<{ readonly const: "hello" }>(c._schema);
  expectTypeOf<typeof c._output>().toEqualTypeOf<"hello">();
});

test("literal is an alias for const", () => {
  const c = s.literal(42);
  assertType<{ readonly const: 42 }>(c._schema);
  expectTypeOf<typeof c._output>().toEqualTypeOf<42>();
});
