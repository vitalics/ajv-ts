import { expectTypeOf } from "expect-type";
import { assertType, test } from "vitest";
import s from "../src";

test("union merges primitives", () => {
	const u = s.union(s.string(), s.number());
	expectTypeOf<typeof u._output>().toEqualTypeOf<string | number>();
});

test("or is an alias for union", () => {
	const u = s.or(s.boolean(), s.const("ok"));
	expectTypeOf<typeof u._output>().toEqualTypeOf<boolean | "ok">();
});
