import { assertType, test } from "vitest";
import { expectTypeOf } from "expect-type";
import s from "../src";

test("array default schema is minimal", () => {
  const arr = s.array();
  assertType<{ readonly type: "array"; readonly items: unknown }>(arr._schema);
});

test("array with element schema exposes items", () => {
  const arr = s.array(s.string());
  assertType<{ readonly type: "array"; readonly items: { readonly type: "string" } }>(arr._schema);
  expectTypeOf<typeof arr._output>().toEqualTypeOf<string[]>();
});

test("element getter returns element builder", () => {
  const arr = s.array(s.number());
  assertType<{ readonly type: "number" }>(arr.element._schema);
  expectTypeOf<typeof arr.element._output>().toEqualTypeOf<number>();
});

test("prefix adds prefixItems", () => {
  const arr = s.array().prefix(s.string(), s.number());
  assertType<{
    readonly type: "array";
    readonly prefixItems: readonly [{ readonly type: "string" }, { readonly type: "number" }];
  }>(arr._schema);
  expectTypeOf<typeof arr._output>().toMatchTypeOf<[string, number, ...unknown[]]>();
});

test("minLength narrows output tuple", () => {
  const arr = s.array(s.string()).minLength(2);
  assertType<{ readonly type: "array"; readonly items: { readonly type: "string" }; readonly minItems: 2 }>(arr._schema);
  expectTypeOf<typeof arr._output>().toMatchTypeOf<[string, string, ...string[]]>();
});

test("maxLength narrows output tuple", () => {
  const arr = s.array(s.string()).maxLength(3);
  expectTypeOf<typeof arr._output>().toMatchTypeOf<[string, string, string]>();
});

test("length narrows output tuple", () => {
  const arr = s.array(s.string()).length(2);
  expectTypeOf<typeof arr._output>().toMatchTypeOf<[string, string]>();
});

test("nonEmpty adds minItems: 1", () => {
  const arr = s.array(s.number()).nonEmpty();
  assertType<{ readonly type: "array"; readonly items: { readonly type: "number" }; readonly minItems: 1 }>(arr._schema);
});

test("unique adds uniqueItems", () => {
  const arr = s.array(s.string()).unique();
  assertType<{ readonly type: "array"; readonly items: { readonly type: "string" }; readonly uniqueItems: true }>(arr._schema);
});

test("contains/minContains/maxContains add keys", () => {
  const arr = s.array(s.number()).contains(s.number().gt(0)).minContains(1).maxContains(5);
  assertType<{
    readonly type: "array";
    readonly items: { readonly type: "number" };
    readonly contains: { readonly type: "number"; readonly exclusiveMinimum: 0 };
    readonly minContains: 1;
    readonly maxContains: 5;
  }>(arr._schema);
});
