export type Create<
  L extends number,
  T = unknown,
  U extends T[] = []
> = U['length'] extends L ? U : Create<L, T, [T, ...U]>;

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

export type Length<T extends unknown[] = []> = T['length']

export type Head<T> = T extends [infer First, ...unknown[]] ? First : never;
export type Tail<T> = T extends [infer _, ...infer Rest] ? Rest : [];

export type MakeReadonly<T extends readonly unknown[]> = readonly T
