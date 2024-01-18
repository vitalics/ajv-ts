/**
* A TypeScript type alias called `Prettify`.
* It takes a type as its argument and returns a new type that has the same properties as the original type, 
* but the properties are not intersected. This means that the new type is easier to read and understand.
*/
export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}
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

export type Merge<T> = {
  [K in keyof T]: T[K]
}

export type OptionalByKey<T, K extends keyof T> = Omit<T, K> & { [Key in K]?: T[Key] }

export type InferKeys<T> = T extends Record<infer K, any> ? K : never;

export type OptionalUndefined<
  T,
  Props extends keyof T = keyof T,
  OptionsProps extends keyof T =
  Props extends keyof T ?
  undefined extends T[Props] ?
  Props : never
  : never
> =
  Prettify<Merge<{
    [K in OptionsProps]?: T[K]
  } & {
      [K in Exclude<keyof T, OptionsProps>]: T[K]
    }>>

export type IndexType<T, Index = unknown> = {
  [K in keyof T]: T[K]
} & {
    [K in string]: Index
  }

export type OmitMany<T, Keys extends (string | number | symbol)[]> = Omit<T, Keys[number]>

export type OmitByValue<T, V> = {
  [K in keyof T as T[K] extends V ? never: K]: T[K]
}
