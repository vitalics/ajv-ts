import type { IsInteger, IsNegative } from "type-fest";
import { NumberSchema } from "../schema/types";
import type { Create } from "./array";
import type { Reverse } from "./string";

/** `T > U` */
export type GreaterThan<
	T extends number,
	U extends number,
> = Create<U> extends [...Create<T>, ...infer _] ? false : true;
/** `T >= U` */
export type GreaterThanOrEqual<T extends number, U extends number> = Equal<
	T,
	U
> extends true
	? true
	: GreaterThan<T, U>;

/** `T < U` */
export type LessThan<T extends number, U extends number> = GreaterThanOrEqual<
	T,
	U
> extends true
	? false
	: true;

/** `T === U` */
export type Equal<
	T extends number,
	U extends number,
> = Create<U>["length"] extends Create<T>["length"] ? true : false;

/** `T !== U` */
export type NotEqual<T extends number, U extends number> = Equal<
	T,
	U
> extends true
	? false
	: true;

/** `T <= U` */
export type LessThanOrEqual<T extends number, U extends number> = Equal<
	T,
	U
> extends true
	? true
	: LessThan<T, U>;

export type IsFloat<N extends number | string> = N extends number
	? IsFloat<`${N}`>
	: N extends `${number}.${number extends 0 ? "" : number}`
		? true
		: false;
export type IsPositiveInteger<N extends number> = IsInteger<N> extends true
	? IsNegative<N> extends false
		? true
		: false
	: false;
export type Negative<N extends number> =
	`${N}` extends `-${infer V extends number}` ? N : V;

export type IsNumberSubset<
	N1 extends number,
	N2 extends number,
> = GreaterThanOrEqual<N1, N2> extends false
	? LessThanOrEqual<N1, N2> extends false
		? true
		: [false, "less than "]
	: [false, "greater than"];

export type NumericStringifyType<N extends number> = IsFloat<N> extends true
	? "Float"
	: IsInteger<N> extends true
		? "Int"
		: "Unknown";

type ParseInt<T extends string> = T extends `${infer Digit extends number}`
	? Digit
	: never;
type ReverseString<S extends string> = S extends `${infer First}${infer Rest}`
	? `${ReverseString<Rest>}${First}`
	: "";
type RemoveLeadingZeros<S extends string> = S extends "0"
	? S
	: S extends `${"0"}${infer R}`
		? RemoveLeadingZeros<R>
		: S;

type InternalPlusOne<S extends string> =
	S extends `${infer Digit extends number}${infer Rest}`
		? Digit extends 0
			? `1${InternalPlusOne<Rest>}`
			: `${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0][Digit]}${Rest}`
		: never;

type InternalMinusOne<S extends string> =
	S extends `${infer Digit extends number}${infer Rest}`
		? Digit extends 0
			? `9${InternalMinusOne<Rest>}`
			: `${[9, 0, 1, 2, 3, 4, 5, 6, 7, 8][Digit]}${Rest}`
		: never;
export type MinusOne<T extends number> = ParseInt<
	RemoveLeadingZeros<ReverseString<InternalMinusOne<ReverseString<`${T}`>>>>
>;
export type PlusOne<T extends number> = ParseInt<
	RemoveLeadingZeros<ReverseString<InternalPlusOne<ReverseString<`${T}`>>>>
>;

export type Plus<
	T1 extends number,
	T2 extends number,
	Result extends number = T1,
> = T2 extends 0 ? Result : Plus<MinusOne<T1>, MinusOne<T2>, PlusOne<Result>>;

export type Minus<
	T1 extends number,
	T2 extends number,
	Result extends number = T1,
> = T2 extends 0 ? Result : Minus<MinusOne<T1>, MinusOne<T2>, MinusOne<Result>>;
