import { GreaterThan, MinusOne } from './number'
export type Create<
  L extends number,
  T = unknown,
  U extends T[] = []
> = U['length'] extends L ? U : Create<L, T, [T, ...U]>;

type RemoveFirstElsFromArray<
  Arr extends unknown[],
  Count extends number
> = Length<Arr> extends Count ? [] : GreaterThan<Arr['length'], Count> extends true ?
Count extends 0 ? Arr :
Arr extends [infer First, ...infer Rest] ? RemoveFirstElsFromArray<Rest, MinusOne<Count>> : never
: [never, 'Cannot remove element count which more than array length']


export type Length<T extends unknown[] = []> = T['length']

/**
 * Create array between min and max values
 * @example
 * type A = CreateBetween<1,2, number> 
 * [number, number | null]
 */
export type CreateBetween<
  Min extends number,
  Max extends number,
  MinType = unknown,
  MaxType = MinType,
> = Max extends Min ? Create<Min, MinType>
  : GreaterThan<Max, Min> extends true ? [...Create<Min, MinType>, ...RemoveFirstElsFromArray<Create<Max, MaxType?>, Min>]
  : [never, 'Max should be more than Min']

type Num<T extends number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  [K: number]: number
}[T]

type A = Num<number>

type Arr = [string, ...string[]]
type L = Arr['length']
type T = Create<L>
type QWE = CreateBetween<Arr['length'], 2, string>

export type CreateMinArray<L extends number, T = unknown> = [...Create<L, T>, ...T[]]
