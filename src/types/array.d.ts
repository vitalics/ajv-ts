import type {
  GreaterThan,
  GreaterThanOrEqual,
  IsFloat,
  IsPositiveInteger,
  LessThan,
  LessThanOrEqual,
  MinusOne,
} from "./number";

import type { Prettify as ObjectPrettify } from "./object";

export type IsArray<T, Type = unknown> = T extends Array<Type> ? true : false;

export type Create<
  L extends number,
  T = unknown,
  U extends T[] = [],
> = IsPositiveInteger<L> extends true
  ? U["length"] extends L
    ? U
    : Create<L, T, [T, ...U]>
  : never;

/** Exclude Element from given array
 * @example
 * type Arr = [1,2,3]
 * type Result = ExcludeArr<Arr, 2> // [1,3]
 */
export type ExcludeArr<
  Arr extends readonly unknown[],
  El,
> = Arr extends readonly [infer Head, ...infer Tail extends readonly unknown[]]
  ? Head extends El
    ? ExcludeArr<Tail, El>
    : readonly [Head, ...ExcludeArr<Tail, El>]
  : Arr;

/** Take seletected Elements from given array
 * @example
 * type Arr = [1,2,3]
 * type Result = TakeArrEl<Arr, 2> // [2]
 */
export type TakeArrEl<Arr extends readonly unknown[], El> = Exclude<
  Arr[number],
  El
> extends never
  ? Arr
  : Arr extends readonly [infer Head, ...infer Tail]
    ? Head extends El
      ? ExcludeArr<Tail, El>
      : [Head, ...ExcludeArr<Tail, El>]
    : Arr;

export type Length<T extends readonly unknown[] = []> = T["length"];

export type Head<T> = T extends [infer First, ...unknown[]] ? First : never;
export type Tail<T> = T extends [infer _, ...infer Rest] ? Rest : [];

/** Remove first N elements from given array */
export type Drop<T, N extends number> = N extends 0
  ? T
  : T extends readonly unknown[]
    ? number extends T["length"]
      ? T
      : Drop<Tail<T>, MinusOne<N>>
    : T;

export type MakeReadonly<T> = T extends readonly [...infer Rest]
  ? readonly [...Rest]
  : T extends ReadonlyArray<infer Arr>
    ? readonly Arr[]
    : T extends Array<infer Arr>
      ? readonly Arr[]
      : never;

export type Optional<T extends readonly unknown[]> = number extends T["length"]
  ? T
  : T extends readonly [infer First, ...infer Rest]
    ? [First?, ...Optional<Rest>]
    : T;

export type Reverse<
  Arr extends readonly [],
  Result extends readonly [] = [],
> = Arr extends [infer First, ...infer Rest]
  ? Reverse<Rest, [First, ...Result]>
  : Result;
export type At<
  Arr extends readonly unknown[],
  Index extends number,
> = GreaterThanOrEqual<0, Index> extends true
  ? LessThan<Index, Length<Arr>> extends true
    ? Arr[Index]
    : `${Index}` extends `-${infer Positive extends number}`
      ? Reverse<Arr>[Positive]
      : never
  : Arr[Index];
export type Concat<Arr1 extends unknown[], Arr2 extends unknown[]> = [
  ...Arr1,
  ...Arr2,
];

export type Push<Arr extends unknown[], T> = [...Arr, T];

export type Prettify<
  T extends readonly unknown[],
  Result extends readonly unknown[] = [],
> = T extends [infer First, ...infer Rest]
  ? First extends Record<any, any>
    ? Prettify<Rest, [...Result, ObjectPrettify<First>]>
    : Prettify<Rest, [...Result, First]>
  : Result;
