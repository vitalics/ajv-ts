import { Create } from './array'
import { Reverse } from './string';

/** `T > U` */
export type GreaterThan<T extends number, U extends number> = Create<U> extends [...Create<T>, ...infer _] ? false : true;
/** `T >= U` */
export type GreaterThanOrEqual<T extends number, U extends number> = Equal<T, U> extends true ? true : GreaterThan<T, U>

/** `T < U` */
export type LessThan<T extends number, U extends number> = GreaterThanOrEqual<T, U> extends true ? false : true

/** `T === U` */
export type Equal<T extends number, U extends number> = Create<U>['length'] extends Create<T>['length'] ? true : false;

/** `T !== U` */
export type NotEqual<T extends number, U extends number> = Equal<T, U> extends true ? false : true

/** `T <= U` */
export type LessThanOrEqual<T extends number, U extends number> = Equal<T, U> extends true ? true : LessThan<T, U>

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

export type Negative<N extends number> = `${N}` extends `-${infer V extends number}` ? N : V

export type IsNumberSubset<N1 extends number, N2 extends number> =
  GreaterThanOrEqual<N1, N2> extends false ?
  LessThanOrEqual<N1, N2> extends false ?
  true : [false, 'less than '] : [false, 'greater than']
