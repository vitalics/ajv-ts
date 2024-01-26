import { Create } from './array'
import { Reverse } from './string';

/** `T>=U` */
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
