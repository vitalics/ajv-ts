/**
 * Module for make a glue for array of objects.
 */

import type { OmitUndefined as ObjectOmitUndefined, Prettify } from "./object";

/** Remove all optional fields from objects in array */
export type OmitUndefined<
  A extends readonly unknown[],
  Result extends readonly unknown[] = []
> = A extends [
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  infer First extends Record<any, any>,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  ...infer Rest extends readonly Record<any, any>[]
]
  ? OmitUndefined<Rest, [...Result, Prettify<ObjectOmitUndefined<First>>]>
  : Result;
