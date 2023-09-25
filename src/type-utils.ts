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

/**
 * @example
 * interface User {
 *   name?: string
 *   age?: number
 *   address?: string
 * }
 *
 * type UserRequiredName = RequiredByKeys<User, 'name'>
 * // { name: string; age?: number; address?: string }
 * @see https://github.com/type-challenges/type-challenges/issues/3180
 */
export type RequiredByKeys<T, K = keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P]
} & {
    [P in keyof T as P extends K ? P : never]-?: T[P]
  } extends infer I
  ? { [P in keyof I]: I[P] }
  : never

export type AssertEqual<T, U> = (<V>() => V extends T ? 1 : 2) extends <
  V
>() => V extends U ? 1 : 2
  ? true
  : false;

type Merge<T> = {
  [K in keyof T]: T[K]
}

export type OptionalUndefined<
  T,
  Props extends keyof T = keyof T,
  OptionsProps extends keyof T =
  Props extends keyof T ?
  undefined extends T[Props] ?
  Props : never
  : never
> =
  Merge<{
    [K in OptionsProps]?: T[K]
  } & {
      [K in Exclude<keyof T, OptionsProps>]: T[K]
    }>

export type IndexType<T, Index = unknown> = {
  [K in keyof T]: T[K]
} & {
    [K in string]: Index
  }
