/**
 * Module for make a glue for array of objects.
 */

import type { OmitUndefined as ObjectOmitUndefined, Prettify } from "./object";

/** Remove all optional fields from objects in array */
export type OmitUndefined<
  A extends readonly unknown[],
  Result extends readonly unknown[] = [],
> = A extends [
  infer First extends Record<any, any>,
  ...infer Rest extends readonly Record<any, any>[],
]
  ? OmitUndefined<Rest, [...Result, Prettify<ObjectOmitUndefined<First>>]>
  : Result;
