import type { EnumAnnotation } from "../schema/types";
import type { UnionToTuple } from "../types";
import { SchemaBuilder } from "./base";

type EnumLike = { [k: string]: string | number; [nu: number]: string };

export class EnumSchemaBuilder<
	const Enum extends EnumLike = EnumLike,
	const Tuple extends Enum[keyof Enum][] = Enum[keyof Enum][],
> extends SchemaBuilder<Tuple, EnumAnnotation, Tuple[number]> {
	private _enum: Record<keyof Enum, unknown> = {} as unknown as Record<
		keyof Enum,
		unknown
	>;

	readonly options = [] as unknown as Tuple;

	constructor(values: Tuple) {
		// TODO: warning about tuple appears here in strict mode. Need to declare `type` field
		super({ enum: values as never });
		for (const v of values) {
			this._enum[v] = v;
		}
		this.options = values;
	}

	/**
	 * returns enum as object representation
	 */
	get enum(): Enum {
		return this._enum as never;
	}
}

export class NativeEnumSchemaBuilder<T extends EnumLike> extends SchemaBuilder<
	T,
	EnumAnnotation
> {
	get enum(): T {
		return this.enumValues;
	}
	get options(): (keyof T)[] {
		return Object.values(this.enumValues);
	}
	constructor(private enumValues: T) {
		super({ enum: Object.values(enumValues) });
	}
}

/**
 * handle `enum` typescript type to make `enum` JSON annotation
 */
export function makeEnum<E extends EnumLike = EnumLike>(
	enumLike: E,
): EnumSchemaBuilder<E, E[keyof E][]>;
/**
 * handle tuple(array) of possible values to make `enum` JSON annotation
 */
export function makeEnum<
	const P extends string | number = string | number,
	const T extends P[] | readonly P[] = [],
	const U extends UnionToTuple<T[number]> = UnionToTuple<T[number]>,
>(
	possibleValues: T,
): EnumSchemaBuilder<
	{ [K in Extract<T[number], string>]: K },
	Extract<T[number], string>[]
>;
export function makeEnum(tupleOrEnum: unknown) {
	if (
		typeof tupleOrEnum === "object" &&
		tupleOrEnum !== null &&
		!Array.isArray(tupleOrEnum)
	) {
		// enum
		return new NativeEnumSchemaBuilder(tupleOrEnum as never);
	}
	if (Array.isArray(tupleOrEnum)) {
		// tuple
		return new EnumSchemaBuilder(tupleOrEnum);
	}
	throw new Error("Cannot handle non tuple or non enum type.", {
		cause: { type: typeof tupleOrEnum, value: tupleOrEnum },
	});
}
