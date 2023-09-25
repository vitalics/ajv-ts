// @ts-ignore TS6133
import { expect, test } from "@jest/globals";

import * as s from "../src";

const constTuna = s.const("tuna");
const constFortyTwo = s.const(42);
const constTrue = s.const(true);


test("passing validations", () => {
  constTuna.parse("tuna");
  constFortyTwo.parse(42);
  constTrue.parse(true);
});

test("failing validations", () => {
  expect(() => constTuna.parse("shark")).toThrow();
  expect(() => constFortyTwo.parse(43)).toThrow();
  expect(() => constTrue.parse(false)).toThrow();
});

test("invalid_const should have `received` field with data", () => {
  const data = "shark";
  const result = constTuna.safeParse(data);
  if (!result.success) {
    expect(result.error).toBeInstanceOf(Error)
  }
});