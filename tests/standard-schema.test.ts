import type { StandardSchemaV1 } from "@standard-schema/spec";
import { assertType, expect, test } from "vitest";

import s, { type InferOutputType } from "../src";

/**
 * `StandardSchemaV1.validate` may return a Promise, but ajv-ts validation is always synchronous.
 * This helper unwraps the sync result and narrows the type.
 */
function validateSync<S extends StandardSchemaV1>(schema: S, value: unknown) {
	const result = schema["~standard"].validate(value);
	if (result instanceof Promise) {
		throw new Error("unexpected async validate");
	}
	return result;
}

test("~standard properties are defined", () => {
	const schema = s.string();

	expect(schema["~standard"].version).toBe(1);
	expect(schema["~standard"].vendor).toBe("ajv-ts");
	expect(typeof schema["~standard"].validate).toBe("function");
});

test("schema builder is assignable to StandardSchemaV1", () => {
	assertType<StandardSchemaV1>(s.string());
	assertType<StandardSchemaV1<string>>(s.string());
	assertType<StandardSchemaV1>(s.object({ name: s.string() }));
	assertType<StandardSchemaV1>(s.array(s.number()));
	assertType<StandardSchemaV1>(s.or(s.string(), s.number()));
});

test("InferInput/InferOutput matches library inference", () => {
	const schema = s.object({ name: s.string() });

	assertType<StandardSchemaV1.InferOutput<typeof schema>>(
		{} as InferOutputType<typeof schema>,
	);
	assertType<InferOutputType<typeof schema>>(
		{} as StandardSchemaV1.InferOutput<typeof schema>,
	);
	assertType<StandardSchemaV1.InferInput<typeof schema>>(
		{} as InferOutputType<typeof schema>,
	);
});

test("validate returns value for valid input", () => {
	const result = validateSync(s.string(), "hello");

	expect(result).toStrictEqual({ value: "hello" });
	expect(result.issues).toBeUndefined();
});

test("validate returns issues for invalid input", () => {
	const result = validateSync(s.string(), 42);

	expect(result.issues).toBeDefined();
	expect(result.issues).toHaveLength(1);
	expect(result.issues?.[0]?.message).toBe("must be string");
	// root value has no path
	expect(result.issues?.[0]?.path).toBeUndefined();
});

test("issues contains path for nested object properties", () => {
	const schema = s.object({
		name: s.string(),
		age: s.number(),
	});

	const result = validateSync(schema, { name: "John", age: "30" });

	expect(result.issues).toHaveLength(1);
	expect(result.issues?.[0]?.message).toBe("must be number");
	expect(result.issues?.[0]?.path).toStrictEqual(["age"]);
});

test("issues contains path for array elements", () => {
	const schema = s.array(s.number());

	const result = validateSync(schema, [1, "2", 3]);

	expect(result.issues).toHaveLength(1);
	expect(result.issues?.[0]?.path).toStrictEqual(["1"]);
});

test("issues for union schemas", () => {
	const schema = s.or(s.string(), s.number());

	const valid = validateSync(schema, "hello");
	expect(valid).toStrictEqual({ value: "hello" });

	const invalid = validateSync(schema, true);
	expect(invalid.issues).toBeDefined();
	expect(invalid.issues?.length).toBeGreaterThan(0);
});

test("validate respects default values", () => {
	const schema = s.object({
		age: s.int().default(18),
	});

	expect(validateSync(schema, {})).toStrictEqual({ value: { age: 18 } });
});
