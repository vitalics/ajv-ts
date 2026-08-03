import Ajv from "ajv";
import { expectTypeOf } from "expect-type";
import { assertType, test } from "vitest";
import s from "../src";
import type { SafeParseResult } from "../src/builder/base";

test("infer and input helpers match output", () => {
  const str = s.string();
  expectTypeOf<s.infer<typeof str>>().toEqualTypeOf<string>();
  expectTypeOf<s.input<typeof str>>().toEqualTypeOf<string>();
});

test("any and unknown builders", () => {
  const anySchema = s.any();
  expectTypeOf<typeof anySchema._output>().toEqualTypeOf<any>();

  const unknownSchema = s.unknown();
  expectTypeOf<typeof unknownSchema._output>().toEqualTypeOf<unknown>();
});

test("create produces a builder with the given ajv instance", () => {
  const custom = s.create(new Ajv());
  const customString = custom.string();
  assertType<{ readonly type: "string" }>(customString._schema);
});

test("examples adds annotation", () => {
  const str = s.string().examples("a", "b");
  assertType<{
    readonly type: "string";
    readonly examples: readonly ["a", "b"];
  }>(str._schema);
});

test("meta keeps the same schema type", () => {
  const str = s.string().meta({ title: "Name" });
  assertType<{ readonly type: "string" }>(str._schema);
});

test("error adds errorMessage", () => {
  const str = s.string().error("bad");
  assertType<{
    readonly type: "string";
    readonly errorMessage: string | Record<string, unknown>;
  }>(str._schema);
});

test("default narrows output", () => {
  const str = s.string().default("x");
  assertType<{ readonly type: "string"; readonly default: "x" }>(str._schema);
  expectTypeOf<typeof str._output>().toEqualTypeOf<"x">();
});

test("optional adds undefined to output", () => {
  const str = s.string().optional();
  expectTypeOf<typeof str._output>().toEqualTypeOf<string | undefined>();
});

test("readonly adds readOnly", () => {
  const str = s.string().readonly();
  assertType<{ readonly type: "string"; readonly readOnly: true }>(str._schema);
});

test("async/sync toggle $async in schema type", () => {
  const asyncStr = s.string().async();
  assertType<{ readonly type: "string" } & { $async: true }>(asyncStr._schema);

  const syncStr = asyncStr.sync();
  assertType<{ readonly type: "string" } & { $async: false }>(syncStr._schema);

  const removed = syncStr.sync(true);
  assertType<{ readonly type: "string" } & { $async: false }>(removed._schema);
});

test("async makes safeParse/parse/validate return promises", () => {
  const syncStr = s.string();
  expectTypeOf(syncStr.safeParse("x")).toEqualTypeOf<SafeParseResult<string>>();
  expectTypeOf(syncStr.parse("x")).toEqualTypeOf<string>();
  expectTypeOf(syncStr.validate("x")).toEqualTypeOf<boolean>();

  const asyncStr = s.string().async();
  expectTypeOf(asyncStr.safeParse("x")).toEqualTypeOf<
    Promise<SafeParseResult<string>>
  >();
  expectTypeOf(asyncStr.parse("x")).toEqualTypeOf<Promise<string>>();
  expectTypeOf(asyncStr.validate("x")).toEqualTypeOf<Promise<boolean>>();

  const backToSync = asyncStr.sync();
  expectTypeOf(backToSync.safeParse("x")).toEqualTypeOf<
    SafeParseResult<string>
  >();
});

test("fromJSON merges extra schema properties", () => {
  const merged = s.fromJSON({ type: "string", title: "Example" }, s.string());
  assertType<{ readonly type: "string"; readonly title: string }>(
    merged._schema,
  );
});

test("schema and shape getters return the same type", () => {
  const str = s.string();
  assertType<typeof str.shape>(str.schema);
});
