import { expectTypeOf } from "expect-type";
import { assertType, test } from "vitest";
import s from "../src";

test("number default schema is minimal", () => {
	const num = s.number();
	assertType<{ readonly type: "number" }>(num._schema);
	expectTypeOf<typeof num._output>().toEqualTypeOf<number>();
});

test("integer() changes the type", () => {
	const int = s.number().integer();
	assertType<{ readonly type: "integer" }>(int._schema);
	expectTypeOf<typeof int._output>().toEqualTypeOf<number>();
});

test("minimum adds the key lazily", () => {
	const num = s.number().minimum(5);
	assertType<{ readonly type: "number"; readonly minimum: 5 }>(num._schema);
});

test("exclusive minimum adds exclusiveMinimum", () => {
	const num = s.number().minimum(5, true);
	assertType<{ readonly type: "number"; readonly exclusiveMinimum: 5 }>(
		num._schema,
	);
});

test("maximum adds the key lazily", () => {
	const num = s.number().maximum(10);
	assertType<{ readonly type: "number"; readonly maximum: 10 }>(num._schema);
});

test("gt/gte/lt/lte produce correct schema keys", () => {
	const gt = s.number().gt(0);
	assertType<{ readonly type: "number"; readonly exclusiveMinimum: 0 }>(
		gt._schema,
	);

	const gte = s.number().gte(0);
	assertType<{ readonly type: "number"; readonly minimum: 0 }>(gte._schema);

	const lt = s.number().lt(0);
	assertType<{ readonly type: "number"; readonly exclusiveMaximum: 0 }>(
		lt._schema,
	);

	const lte = s.number().lte(0);
	assertType<{ readonly type: "number"; readonly maximum: 0 }>(lte._schema);
});

test("positive/nonnegative/negative/nonpositive use range keys", () => {
	assertType<{ readonly type: "number"; readonly exclusiveMinimum: 0 }>(
		s.number().positive()._schema,
	);
	assertType<{ readonly type: "number"; readonly minimum: 0 }>(
		s.number().nonnegative()._schema,
	);
	assertType<{ readonly type: "number"; readonly exclusiveMaximum: 0 }>(
		s.number().negative()._schema,
	);
	assertType<{ readonly type: "number"; readonly maximum: 0 }>(
		s.number().nonpositive()._schema,
	);
});

test("multipleOf and step add the key", () => {
	const m = s.number().multipleOf(5);
	assertType<{ readonly type: "number"; readonly multipleOf: 5 }>(m._schema);

	const step = s.number().step(0.1);
	assertType<{ readonly type: "number"; readonly multipleOf: 0.1 }>(
		step._schema,
	);
});

test("format adds the key", () => {
	const num = s.number().format("int32");
	assertType<{ readonly type: "number"; readonly format: "int32" }>(
		num._schema,
	);
});

test("const narrows output to the literal", () => {
	const num = s.number().const(42);
	assertType<{ readonly type: "number"; readonly const: 42 }>(num._schema);
	expectTypeOf<typeof num._output>().toEqualTypeOf<42>();
});

test("safe() adds min/max bounds", () => {
	const num = s.number().safe();
	assertType<{
		readonly type: "number";
		readonly minimum: number;
		readonly maximum: number;
	}>(num._schema);
});
