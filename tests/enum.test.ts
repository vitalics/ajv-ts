import { test, expect } from 'bun:test'

import s from '../src'
import { assertEqualType, assertIs } from '../src/utils';

test("create enum", () => {
  const MyEnum = s.enum(["Red", "Green", "Blue"]);
  expect(MyEnum.enum.Red).toEqual("Red");
  expect(MyEnum.enum.Blue).toEqual("Blue");
  expect(MyEnum.enum.Green).toEqual("Green");
});

test("infer enum", () => {
  const MyEnum = s.enum(["Red", "Green", "Blue"]);
  type MyEnum = s.infer<typeof MyEnum>;
  assertEqualType<MyEnum, "Red" | "Green" | "Blue">(true);
});

test("get options", () => {
  expect(s.enum(["tuna", "trout"]).options).toEqual(["tuna", "trout"]);
});

test("readonly enum", () => {
  const HTTP_SUCCESS = ["200", "201"] as const;
  const arg = s.enum(HTTP_SUCCESS);
  type arg = s.infer<typeof arg>;
  assertEqualType<arg, "200" | "201">(true);

  arg.parse("201");
  expect(() => arg.parse("202")).toThrow();
});


test("nativeEnum test with consts", () => {
  const Fruits: { Apple: "apple"; Banana: "banana" } = {
    Apple: "apple",
    Banana: "banana",
  };
  const fruitEnum = s.enum(Fruits);
  type fruitEnum = s.infer<typeof fruitEnum>;
  fruitEnum.parse("apple");
  fruitEnum.parse("banana");
  fruitEnum.parse(Fruits.Apple);
  fruitEnum.parse(Fruits.Banana);
  assertEqualType<fruitEnum, "apple" | "banana">(true);
});

test("nativeEnum test with real enum", () => {
  enum Fruits {
    Apple = "apple",
    Banana = "banana",
  }
  const fruitEnum = s.enum(Fruits);
  type fruitEnum = s.infer<typeof fruitEnum>;
  fruitEnum.parse("apple");
  fruitEnum.parse("banana");
  fruitEnum.parse(Fruits.Apple);
  fruitEnum.parse(Fruits.Banana);
  assertIs<fruitEnum extends Fruits ? true : false>(true);
});

test("nativeEnum test with const with numeric keys", () => {
  const FruitValues = {
    Apple: 10,
    Banana: 20,
  } as const;
  const fruitEnum = s.enum(FruitValues);
  type fruitEnum = s.infer<typeof fruitEnum>;
  fruitEnum.parse(10);
  fruitEnum.parse(20);
  fruitEnum.parse(FruitValues.Apple);
  fruitEnum.parse(FruitValues.Banana);
  assertEqualType<fruitEnum, 10 | 20>(true);
});

test("from enum", () => {
  enum Fruits {
    Cantaloupe,
    Apple = "apple",
    Banana = "banana",
  }

  const FruitEnum = s.enum(Fruits);
  type FruitEnum = s.infer<typeof FruitEnum>;
  FruitEnum.parse(Fruits.Cantaloupe);
  FruitEnum.parse(Fruits.Apple);
  FruitEnum.parse("apple");
  FruitEnum.parse(0);
  expect(() => FruitEnum.parse(1)).toThrow();
  expect(() => FruitEnum.parse("Apple")).toThrow();
  expect(() => FruitEnum.parse("Cantaloupe")).not.toThrow();
});

test("from const", () => {
  const Greek = {
    Alpha: "a",
    Beta: "b",
    Gamma: 3,
  } as const;

  const GreekEnum = s.enum(Greek);
  type GreekEnum = s.infer<typeof GreekEnum>;
  GreekEnum.parse("a");
  GreekEnum.parse("b");
  GreekEnum.parse(3);
  expect(() => GreekEnum.parse("v")).toThrow();
  expect(() => GreekEnum.parse("Alpha")).toThrow();
  expect(() => GreekEnum.parse(2)).toThrow();

  expect(GreekEnum.enum.Alpha).toEqual("a");
});

