export type Length<S extends string, C extends number[] = []> = S extends `${infer F0}${infer F1}${infer F2}${infer F3}${infer F4}${infer F5}${infer F6}${infer F7}${infer F8}${infer F9}${infer R}` ? Length<R, [...C, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]>
  : S extends `${infer F}${infer R}` ?
  Length<R, [...C, 0]>
  : C['length']

export type Reverse<S extends string> = S extends `${infer First}${infer Rest}` ? `${Reverse<Rest>}${First}` : ''

export type UUID = `${string}-${string}-${string}-${string}-${string}`

export type Email = `${string}@${string}.${string}`

export type JoinArray<
  Arr extends readonly string[],
  Result extends string = ''
> = Arr extends [infer First, ...infer Rest] ? JoinArray<Rest, `${Result}${First}`> : Result
