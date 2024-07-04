import type { GreaterThan, GreaterThanOrEqual, LessThan, IsFloat, IsNegative, IsPositiveInteger, LessThanOrEqual } from './number';

export type Create<
  L extends number,
  T = unknown,
  U extends T[] = []
> = IsPositiveInteger<L> extends true ? U['length'] extends L ? U : Create<L, T, [T, ...U]> : never;

/** Exclude Element from given array
 * @example
 * type Arr = [1,2,3]
 * type Result = ExcludeArr<Arr, 2> // [1,3]
 */
export type ExcludeArr<Arr extends any[], El> = Exclude<Arr[number], El> extends never
  ? Arr
  : Arr extends [infer Head, ...infer Tail]
  ? Head extends El
  ? ExcludeArr<Tail, El>
  : [Head, ...ExcludeArr<Tail, El>]
  : Arr;

export type Length<T extends readonly unknown[] = []> = T['length']

export type Head<T> = T extends [infer First, ...unknown[]] ? First : never;
export type Tail<T> = T extends [infer _, ...infer Rest] ? Rest : [];

export type MakeReadonly<T extends readonly unknown[]> = readonly T

export type Optional<T extends readonly unknown[]> = T extends [infer First, ...infer Rest] ? [First?, ...Optional<Rest>] : T

export type Reverse<Arr extends readonly [], Result extends readonly [] = []> = Arr extends [infer First, ...infer Rest] ? Reverse<Rest, [First, ...Result]> : Result
export type At<
  Arr extends readonly unknown[],
  Index extends number
> =
  GreaterThanOrEqual<0, Index> extends true
  ? LessThan<Index, Length<Arr>> extends true
  ? Arr[Index]
  : `${Index}` extends `-${infer Positive extends number}`
  ? Reverse<Arr>[Positive]
  : never
  : Arr[Index]
export type Concat<Arr1 extends unknown[], Arr2 extends unknown[]> = [...Arr1, ...Arr2]

export type Push<Arr extends unknown[], T> = [...Arr, T]
