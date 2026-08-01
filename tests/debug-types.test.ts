import { assertType, test } from "vitest";
import type { Tail } from "../src/types/array";

test("Tail type utility", () => {
	assertType<string[]>({} as Tail<string[]>);
	assertType<[number]>({} as Tail<[string, number]>);
});
