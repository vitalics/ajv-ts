import { NumberSchema } from '../schema/types';
import { Create } from './array'
import { Reverse } from './string';
import { IsInteger, IsNegative } from 'type-fest'

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
export type IsPositiveInteger<N extends number> = IsInteger<N> extends true ? IsNegative<N> extends false ? true : false : false
export type Negative<N extends number> = `${N}` extends `-${infer V extends number}` ? N : V

export type IsNumberSubset<N1 extends number, N2 extends number> =
  GreaterThanOrEqual<N1, N2> extends false ?
  LessThanOrEqual<N1, N2> extends false ?
  true : [false, 'less than '] : [false, 'greater than']

export type NumericStringifyType<N extends number> = IsFloat<N> extends true ? "Float" : IsInteger<N> extends true ? "Int" : "Unknown"