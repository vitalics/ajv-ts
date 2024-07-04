import { IsNever } from './misc'
type TGenericError<Message extends string, Rest extends unknown[] = []> = [
  never,
  Message,
  ...Rest,
]

export type TError<Message extends string> = TGenericError<`Error: ${Message}`>

export type TTypeGenericError<Message extends string, Rest extends unknown[] = []> = TGenericError<`TypeError: ${Message}`, Rest>
export type TTypeError<Actual, Expected> = TGenericError<`TypeError: expected and actual types are not the same.`, ['Expected:', Expected, 'Actual:', Actual]>
export type TRangeGenericError<Message extends string, Rest extends unknown[] = []> = TGenericError<`RangeError: ${Message}`, Rest>
export type TRangeError<Num1 extends number, Num2 extends number> = TGenericError<`RangeError: ${Num1} are out of range of ${Num2}`>

export type IsTGenericError<T> = T extends [infer First, ...infer Rest] ? IsNever<First> : false

export type InferMessage<T> = T extends TGenericError<infer M, any> ? M : never
