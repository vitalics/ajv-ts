/**
 * UnionToIntersection<{ foo: string } | { bar: string }> =
 *  { foo: string } & { bar: string }.
 */
export type UnionToIntersection<U> = (
  U extends unknown ? (arg: U) => 0 : never
) extends (arg: infer I) => 0
  ? I
  : never;

/**
 * LastInUnion<1 | 2> = 2.
 */
type LastInUnion<U> = UnionToIntersection<
  U extends unknown ? (x: U) => 0 : never
> extends (x: infer L) => 0
  ? L
  : never;

/**
 * UnionToTuple<1 | 2> = [1, 2].
 */
export type UnionToTuple<U, Last = LastInUnion<U>> = [U] extends [never]
  ? []
  : [...UnionToTuple<Exclude<U, Last>>, Last];

export type IsUnknown<T> =
  T extends number ? false
  : T extends string ? false
  : T extends string ? false
  : T extends boolean ? false
  : T extends symbol ? false
  : T extends undefined ? false
  : T extends null ? false
  : T extends object ? false
  : T extends unknown ? true
  : false

export type ToPrimal<T> =
  T extends number ? number
  : T extends string ? string
  : T extends boolean ? boolean
  : T extends bigint ? bigint
  : T extends symbol ? symbol
  : T extends readonly unknown[] ? unknown[]
  : T extends object ? object
  : never
export type IsNever<T> = [T] extends [never] ? true : false

export type Fn<
  R = unknown,
  Args extends readonly unknown[] = [],
  This = void
> = (this: This, ...args: Args) => R

export type Return<F extends Fn<any, any>> = F extends Fn<infer Res> ? Res : never
export type Param<F> = F extends Fn<any, infer Args> ? Args : never
