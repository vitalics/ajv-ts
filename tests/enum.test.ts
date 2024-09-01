import { test, expect, assertType } from 'vitest'

import s from '../src'

test("create enum", () => {
  const MyEnum = s.enum(["Red", "Green", "Blue"]);
  expect(MyEnum.enum.Red).toEqual("Red");
  expect(MyEnum.enum.Blue).toEqual("Blue");
  expect(MyEnum.enum.Green).toEqual("Green");
});

test("infer enum", () => {
  const MyEnum = s.enum(["Red", "Green", "Blue"]);
  type MyEnum = s.infer<typeof MyEnum>;
  assertType<MyEnum>('Red')
  assertType<MyEnum>('Green')
  assertType<MyEnum>('Blue')
});

test("get options", () => {
  expect(s.enum(["tuna", "trout"]).options).toEqual(["tuna", "trout"]);
});

test("readonly enum", () => {
  const HTTP_SUCCESS = ["200", "201"] as const;
  const arg = s.enum(HTTP_SUCCESS);
  type arg = s.infer<typeof arg>;
  assertType<arg>('200')
  assertType<arg>('201')

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
  assertType<s.infer<typeof fruitEnum>>("apple")
  assertType<s.infer<typeof fruitEnum>>("banana")
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
  assertType<fruitEnum extends Fruits ? true : false>(true)
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
  assertType<fruitEnum>(10)
  assertType<fruitEnum>(20)
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

test('#61 nullable enum', () => {
  const sex = s.enum(['male', 'female']);
  const nullableSex = s.enum(['male', 'female']).nullable();

  const optionalNullableObj = s.object({
    sex: s.enum(['male', 'female']).nullable().optional(),
  });

  expect(sex.parse('male')).toBe('male');
  expect(sex.parse('female')).toBe('female');
  expect(sex.validate(null)).toBe(false);
  expect(sex.validate(undefined)).toBe(false);

  expect(nullableSex.parse('male'),).toBe('male');
  expect(nullableSex.parse('female'),).toBe('female');
  expect(nullableSex.validate(null)).toBe(true);
  expect(nullableSex.validate(undefined)).toBe(false);
})
