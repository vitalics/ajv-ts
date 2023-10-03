export type Create<
  L extends number,
  T = unknown,
  U extends T[] = []
> = U['length'] extends L ? U : Create<L, T, [T, ...U]>;


export type Length<T extends unknown[] = []> = T['length']
