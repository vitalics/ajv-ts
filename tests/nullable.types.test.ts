import { expectTypeOf } from "expect-type";
import { assertType, test } from "vitest";
import s from "../src";

test("nullable string adds null to output", () => {
  const str = s.string().nullable();
  expectTypeOf<typeof str._output>().toEqualTypeOf<string | null>();
});

test("nullable object adds null to output", () => {
  const obj = s.object({ name: s.string() }).nullable();
  assertType<{ name?: string } | null>(obj._output);
});

test("nullable union keeps union output and adds null", () => {
  const u = s.union(s.string(), s.number()).nullable();
  expectTypeOf<typeof u._output>().toEqualTypeOf<string | number | null>();
});
