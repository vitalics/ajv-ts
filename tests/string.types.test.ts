import { expectTypeOf } from "expect-type";
import { assertType, test } from "vitest";
import s from "../src";

test("string default schema is minimal", () => {
	const str = s.string();
	assertType<{ readonly type: "string" }>(str._schema);
	expectTypeOf<typeof str._output>().toEqualTypeOf<string>();
	expectTypeOf<typeof str._input>().toEqualTypeOf<string>();
});

test("minLength adds the key lazily", () => {
	const str = s.string().minLength(5);
	assertType<{ readonly type: "string"; readonly minLength: 5 }>(str._schema);
});

test("maxLength adds the key lazily", () => {
	const str = s.string().maxLength(10);
	assertType<{ readonly type: "string"; readonly maxLength: 10 }>(str._schema);
});

test("length adds both minLength and maxLength", () => {
	const str = s.string().length(3);
	assertType<{
		readonly type: "string";
		readonly minLength: 3;
		readonly maxLength: 3;
	}>(str._schema);
});

test("nonEmpty adds minLength: 1", () => {
	const str = s.string().nonEmpty();
	assertType<{ readonly type: "string"; readonly minLength: 1 }>(str._schema);
});

test("pattern adds the key", () => {
	const str = s.string().pattern("^[a-z]+$");
	assertType<{ readonly type: "string"; readonly pattern: "^[a-z]+$" }>(
		str._schema,
	);
});

test("format narrows output and adds the key", () => {
	const email = s.string().email();
	assertType<{ readonly type: "string"; readonly format: "email" }>(
		email._schema,
	);

	const uuid = s.string().uuid();
	expectTypeOf<
		typeof uuid._output
	>().toEqualTypeOf<`${string}-${string}-${string}-${string}-${string}`>();
});

test("const narrows output to the literal", () => {
	const str = s.string().const("ok");
	assertType<{ readonly type: "string"; readonly const: "ok" }>(str._schema);
	expectTypeOf<typeof str._output>().toEqualTypeOf<"ok">();
});

test("exclude adds not", () => {
	const str = s.string().exclude(s.const("bad"));
	assertType<{
		readonly type: "string";
		readonly not: { readonly const: "bad" };
	}>(str._schema);
	expectTypeOf<typeof str._output>().toEqualTypeOf<string>();
});

test("not() keeps the original output type", () => {
	const str = s.string().not();
	expectTypeOf<typeof str._output>().toEqualTypeOf<string>();
});

test("array() converts string schema to array schema", () => {
	const arr = s.string().array();
	assertType<{
		readonly type: "array";
		readonly items: { readonly type: "string" };
	}>(arr._schema);
	expectTypeOf<typeof arr._output>().toEqualTypeOf<string[]>();
});

test("readonly adds readOnly", () => {
	const str = s.string().readonly();
	assertType<{ readonly type: "string"; readonly readOnly: true }>(str._schema);
});
