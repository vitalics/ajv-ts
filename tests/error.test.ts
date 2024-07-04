import { test, expect } from "vitest";

import { s } from "../src";

test("Default error should work", () => {
  const StringSchema = s.string().error("Default ERROR here");

  const result = StringSchema.safeParse(123);
  expect(result.error).toBeInstanceOf(Error);
  expect(result.error?.message).toBe("Default ERROR here");
});

test("Default error as placeholder in object should work", () => {
  const StringSchema = s.string().error({ _: "any error here" });

  const result = StringSchema.safeParse(123);
  expect(result.error).toBeInstanceOf(Error);
  expect(result.error?.message).toBe("any error here");
});

test("Type error should work", () => {
  const StringSchema = s
    .string()
    .error({ _: "any error here", type: "not a string. Custom" });

  const result = StringSchema.safeParse(123);
  expect(result.error).toBeInstanceOf(Error);
  expect(result.error?.message).toBe("not a string. Custom");
});

test("properties error should work", () => {
  const Schema = s
    .object({
      foo: s.string(),
    })
    .strict()
    .error({ additionalProperties: "Not expected to pass additional props" });

  const result = Schema.safeParse({ foo: "qwe", abc: 123 });
  expect(result.error).toBeInstanceOf(Error);
  expect(result.error?.message).toBe("Not expected to pass additional props");
});

test("properties error should work", () => {
  const Schema = s
    .object({
      foo: s.integer().minimum(2),
      bar: s.string().minLength(2),
    })
    .strict()
    .error({
      properties: {
        foo: "data.foo should be integer >= 2",
        bar: "data.bar should be string with length >= 2",
      },
    });

  const result = Schema.safeParse({ foo: 1, bar: "a" });
  expect(result.error).toBeInstanceOf(Error);
  expect(result.error?.message).toBe("data.foo should be integer >= 2");
  expect(result.error?.cause).toBeDefined();
  expect(result.error?.cause).toBeInstanceOf(Array);
});
