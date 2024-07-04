import { expect, test } from "vitest";

import * as s from "../src";

const constTuna = s.const("tuna");
const constFortyTwo = s.const(42);
const constTrue = s.const(true);

const terrificSymbol = Symbol("terrific");
const literalTerrificSymbol = s.literal(terrificSymbol as never);
const date = new Date()
const constDate = s.literal(date)

test("passing validations", () => {
  constTuna.parse("tuna");
  constFortyTwo.parse(42);
  constTrue.parse(true);
  constDate.parse(date)
});

test("failing validations", () => {
  expect(() => constTuna.parse("shark")).toThrow();
  expect(() => constFortyTwo.parse(43)).toThrow();
  expect(() => constTrue.parse(false)).toThrow();
  // symbol is not supported in JSON-schema
  expect(() => literalTerrificSymbol.parse(terrificSymbol)).toThrow()
});

test("invalid_const should have `received` field with data", () => {
  const data = "shark";
  const result = constTuna.safeParse(data);
  if (!result.success) {
    expect(result.error).toBeInstanceOf(Error)
  }
});