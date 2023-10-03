import { Create } from './array'
import { Reverse } from './string';
export type GreaterThan<T extends number, U extends number> = Create<U> extends [...Create<T>, ...infer _] ? false : true;

export type IsFloat<N extends number | string> = N extends number
  ? IsFloat<`${N}`>
  : N extends `${number}.${number extends 0 ? '' : number}`
  ? true
  : false

export type IsNegative<N extends number | string> = N extends number
  ? IsNegative<`${N}`>
  : N extends `-${number}`
  ? true
  : false

export type IsPositiveInteger<N extends number | string> = IsFloat<N> extends true
  ? false
  : IsNegative<N> extends true
  ? false
  : true

type ParseInt<T extends string> = T extends `${infer Digit extends number}` ? Digit : never

type RemoveLeadingZeros<S extends string> = S extends '0' ? S : S extends `${'0'}${infer R}` ? RemoveLeadingZeros<R> : S
type InternalMinusOne<
  S extends string
> = S extends `${infer Digit extends number}${infer Rest}` ?
  Digit extends 0 ?
  `9${InternalMinusOne<Rest>}` :
  `${[9, 0, 1, 2, 3, 4, 5, 6, 7, 8][Digit]}${Rest}` :
  never
export type MinusOne<T extends number> = ParseInt<RemoveLeadingZeros<Reverse<InternalMinusOne<Reverse<`${T}`>>>>>
