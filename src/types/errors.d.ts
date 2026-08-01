import type { Merge, Join } from "type-fest";
import type { IsNever } from "./misc";
import type { Prettify } from "./object";
import type { Length } from "./array";
import type { JoinArray } from "./string";

export type TGenericError<
  Props extends readonly {
    readonly name: string;
    readonly stack?: string;
    readonly cause?: unknown;
    readonly message: string;
  }
> = Merge<Error, Props>;

export type TError<
  Message extends string = string,
  Cause = unknown
> = TGenericError<{
  readonly name: "Error";
  readonly message: Message;
  readonly cause: Cause;
}>;

export type TTypeError<
  Message extends string,
  Rest = unknown,
  Stack extends readonly string[] = []
> = TGenericError<{
  readonly name: "TypeError";
  readonly message: Message;
  readonly cause: Rest;
  readonly stack: Join<Stack, " \n ">;
}>;

export type TTypeErrorNotSame<
  Actual,
  Expected,
  Stack extends readonly string[] = readonly []
> = TTypeError<
  `Expected and actual types are not the same.`,
  ["Expected:", Expected, "Actual:", Actual],
  Stack
>;

export type TRangeError<
  Message extends string,
  Cause = unknown,
  Stack extends readonly string[] = []
> = TGenericError<{
  readonly name: "RangeError";
  readonly message: Message;
  readonly cause: Cause;
  readonly stack: Join<Stack, " \n ">;
}>;

export type TRangeErrorOutOfRange<
  Num1 extends number,
  Num2 extends number
> = TRangeError<`${Num1} are out of range of ${Num2}`>;

export type ToString<E extends Error> = E["message"] extends string
  ? E["message"]
  : string;
