import { test, expect } from 'vitest'

import s from '../src'

const gtFive = s.number().gt(5);
const gteFive = s.number().gte(5);
const minFive = s.number().minimum(5);
const ltFive = s.number().lt(5);
const lteFive = s.number().lte(5);
const maxFive = s.number().max(5);
const intNum = s.number().format('int32');
const positive = s.number().positive();
const negative = s.number().negative();
const nonpositive = s.number().nonpositive();
const nonnegative = s.number().nonnegative();
const multipleOfFive = s.number().multipleOf(5);
const multipleOfNegativeFive = s.number().multipleOf(-5);
const safe = s.number().safe();
const stepPointOne = s.number().multipleOf(0.1);
const stepPointseroseroseroOne = s.number().step(0.0001);
const stepSixPointFour = s.number().step(6.4);

test("passing validations", () => {
  s.number().parse(1);
  s.number().parse(1.5);
  s.number().parse(0);
  s.number().parse(-1.5);
  s.number().parse(-1);
  gtFive.parse(6);
  gteFive.parse(5);
  minFive.parse(5);
  ltFive.parse(4);
  lteFive.parse(5);
  maxFive.parse(5);
  intNum.parse(4);
  positive.parse(1);
  negative.parse(-1);
  nonpositive.parse(0);
  nonpositive.parse(-1);
  nonnegative.parse(0);
  nonnegative.parse(1);
  multipleOfFive.parse(15);
  multipleOfFive.parse(-15);
  multipleOfNegativeFive.parse(-15);
  multipleOfNegativeFive.parse(15);
  safe.parse(Number.MIN_SAFE_INTEGER);
  safe.parse(Number.MAX_SAFE_INTEGER);
  stepSixPointFour.parse(12.8);
});

test("failing validations", () => {
  expect(() => ltFive.parse(5)).toThrow();
  expect(() => lteFive.parse(6)).toThrow();
  expect(() => maxFive.parse(6)).toThrow();
  expect(() => gtFive.parse(5)).toThrow();
  expect(() => gteFive.parse(4)).toThrow();
  expect(() => minFive.parse(4)).toThrow();
  expect(() => intNum.parse(3.14)).toThrow();
  expect(() => positive.parse(0)).toThrow();
  expect(() => positive.parse(-1)).toThrow();
  expect(() => negative.parse(0)).toThrow();
  expect(() => negative.parse(1)).toThrow();
  expect(() => nonpositive.parse(1)).toThrow();
  expect(() => nonnegative.parse(-1)).toThrow();
  expect(() => multipleOfFive.parse(7.5)).toThrow();
  expect(() => multipleOfFive.parse(-7.5)).toThrow();
  expect(() => multipleOfNegativeFive.parse(-7.5)).toThrow();
  expect(() => multipleOfNegativeFive.parse(7.5)).toThrow();
  expect(() => safe.parse(Number.MIN_SAFE_INTEGER - 1)).toThrow();
  expect(() => safe.parse(Number.MAX_SAFE_INTEGER + 1)).toThrow();

  expect(() => stepPointOne.parse(6.11)).toThrow();
  expect(() => stepPointOne.parse(6.1000000001)).toThrow();
  expect(() => stepSixPointFour.parse(6.41)).toThrow();
  expect(() => stepPointseroseroseroOne.parse(3.01)).toThrow()
});

test("parse NaN", () => {
  expect(() => s.number().parse(NaN)).toThrow();
});

test('number builder should pass only numbers', () => {
  const schema = s.number()

  expect(schema.schema).toMatchObject({
    type: 'number'
  })
  expect(schema.validate("qwe")).toBe(false)
  expect(schema.validate({})).toBe(false)
  expect(schema.validate(null)).toBe(false)
  expect(schema.validate(() => { })).toBe(false)
  expect(schema.validate(123)).toBe(true)
  expect(schema.validate(12.4)).toBe(true)
})
test('number builder "int32" format should supports only integers', () => {
  const schema = s.number().format('int32').maximum(300)

  expect(schema.schema).toMatchObject({
    type: 'number',
    format: 'int32'
  })
  expect(schema.validate("qwe")).toBe(false)
  expect(schema.validate({})).toBe(false)
  expect(schema.validate(null)).toBe(false)
  expect(schema.validate(() => { })).toBe(false)
  expect(schema.validate(123)).toBe(true)
  expect(schema.validate(400)).toBe(false)
  expect(schema.validate(12.4)).toBe(false)
})

test('integer should supports only integers', () => {
  const schema = s.integer().maximum(300)

  expect(schema.schema).toMatchObject({
    type: 'integer',
  })
  expect(schema.validate("qwe")).toBe(false)
  expect(schema.validate({})).toBe(false)
  expect(schema.validate(null)).toBe(false)
  expect(schema.validate(() => { })).toBe(false)
  expect(schema.validate(123)).toBe(true)
  expect(schema.validate(400)).toBe(false)
  expect(schema.validate(12.4)).toBe(false)
})
