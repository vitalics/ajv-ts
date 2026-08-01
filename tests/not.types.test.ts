import { expectTypeOf } from "expect-type";
import { assertType, test } from "vitest";
import s from "../src";

test("not() negates a schema", () => {
	const n = s.not(s.string());
	expectTypeOf<typeof n._output>().toEqualTypeOf<unknown>();
});

test("never() output is never", () => {
	const n = s.never();
	expectTypeOf<typeof n._output>().toEqualTypeOf<never>();
});

test("builder .not() keeps original output type", () => {
	const n = s.string().not();
	expectTypeOf<typeof n._output>().toEqualTypeOf<string>();
});
