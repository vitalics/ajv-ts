import { expect, test } from "bun:test";

import { assertEqualType } from "../src/utils";
import s from "../src";

const Test = s.object({
  f1: s.number(),
  f2: s.string().optional(),
  f3: s.string().nullable(),
  f4: s.array(
    s.object({
      t: s.union([s.string(), s.boolean()])
    })
  )
});

type Test = s.infer<typeof Test>;

test("object type inference", () => {
  type TestType = {
    f1: number;
    f2?: string | undefined;
    f3: string | null;
    f4: { t: string | boolean }[];
  };

  assertEqualType<Test, TestType>(true);
});

test("unknown throw", () => {
  const asdf: unknown = 35;
  expect(() => Test.parse(asdf)).toThrow();
});

test("correct parsing", () => {
  Test.parse({
    f1: 12,
    f2: "string",
    f3: "string",
    f4: [
      {
        t: "string",
      },
    ],
  });

  Test.parse({
    f1: 12,
    f3: null,
    f4: [
      {
        t: false,
      },
    ],
  });
});

test("nonstrict by default", () => {
  s.object({ points: s.number() }).parse({
    points: 2314,
    unknown: "asdf",
  });
});

const data = {
  points: 2314,
  unknown: "asdf",
};

test("unknownkeys override", () => {
  const val = s
    .object({ points: s.number() })
    .strict()
    .passthrough()
    .parse(data);

  expect(val).toEqual(data);
});

test("passthrough unknown", () => {
  const val = s.object({ points: s.number() }).passthrough().parse(data);

  expect(val).toEqual(data);
});

test("strict", () => {
  const val = s.object({ points: s.number() }).strict().safeParse(data);

  expect(val.success).toEqual(false);
});

test("catchall inference", () => {
  const o1 = s
    .object({
      first: s.string(),
    })

  const d1 = o1.parse({ first: "asdf", num: 1243 });
  assertEqualType<string, (typeof d1)["first"]>(true);
});

test("test that optional keys are unset", async () => {
  const SNamedEntity = s.object({
    id: s.string(),
    set: s.string().optional(),
    unset: s.string().optional(),
  });
  const result = await SNamedEntity.parse({
    id: "asdf",
    set: undefined,
  });
  // eslint-disable-next-line ban/ban
  expect(Object.keys(result)).toEqual(["id", "set"]);
});

test("test nonexistent keys", async () => {
  const Schema = s.union([
    s.object({ a: s.string() }),
    s.object({ b: s.number() }),
  ]);
  const obj = { a: "A" };
  const result = Schema.safeParse(obj); // Works with 1.11.10, breaks with 2.0.0-beta.21
  expect(result.success).toBe(true);
});

test("test async union", async () => {
  const Schema2 = s.union([
    s.object({
      ty: s.string(),
    }),
    s.object({
      ty: s.number(),
    }),
  ]);

  const obj = { ty: "A" };
  const result = Schema2.safeParse(obj); // Works with 1.11.10, breaks with 2.0.0-beta.21
  expect(result.success).toEqual(true);
});

test("test inferred merged type", async () => {
  const a = s.object({ a: s.number() })
  const c = a.extend({ a: s.string() })
  type asdf = s.infer<typeof c>;
  assertEqualType<asdf, { a: string }>(true);
});

test("inferred merged object type with optional properties", async () => {
  const Merged = s
    .object({ a: s.string(), b: s.string().optional() })
    .extend({ a: s.string().optional(), b: s.string() });
  type Merged = s.infer<typeof Merged>;
  assertEqualType<Merged, { a?: string; b: string }>(true);
  // todo
  assertEqualType<Merged, { a?: string; b: string }>(true);
});

test("inferred unioned object type with optional properties", async () => {
  const Unioned = s.union([
    s.object({ a: s.string(), b: s.string().optional() }),
    s.object({ a: s.string().optional(), b: s.string() }),
  ]);
  type Unioned = s.infer<typeof Unioned>;
  assertEqualType<
    Unioned,
    { a: string; b?: string } | { a?: string; b: string }
  >(true);
});

test("inferred enum type", async () => {
  const Enum = s.object({ a: s.string(), b: s.string().optional() }).keyof();

  expect(Enum.enum).toMatchObject({
    a: "a",
    b: "b",
  });
  expect(Enum.options).toEqual(["a", "b"]);
  type Enum = s.infer<typeof Enum>;
  assertEqualType<Enum, "a" | "b">(true);
});

test("inferred partial object type with optional properties", async () => {
  const Partial = s
    .object({ a: s.string(), b: s.string().optional() })
    .partial();
  type Partial = s.infer<typeof Partial>;
  assertEqualType<Partial, { a?: string; b?: string }>(true);
});

test("inferred picked object type with optional properties", async () => {
  const Picked = s
    .object({ a: s.string(), b: s.string().optional() })
    .pick('b');
  type Picked = s.infer<typeof Picked>;
  assertEqualType<Picked, { b?: string }>(true);
});

test("inferred type for unknown/any keys", () => {
  const myType = s.object({
    anyOptional: s.any().optional(),
    anyRequired: s.any(),
    unknownOptional: s.unknown().optional(),
    unknownRequired: s.unknown(),
  });
  type myType = s.infer<typeof myType>;
  assertEqualType<
    myType,
    {
      anyOptional?: any;
      anyRequired?: any;
      unknownOptional?: unknown;
      unknownRequired?: unknown;
    }
  >(true);
});

test("setKey", () => {
  const base = s.object({ name: s.string() });
  const withNewKey = base.extend({ age: s.number() });

  type withNewKey = s.infer<typeof withNewKey>;
  assertEqualType<withNewKey, { name: string; age: number }>(true);
  withNewKey.parse({ name: "asdf", age: 1234 });
});

test("strictcreate", async () => {
  const strictObj = s.object({
    name: s.string(),
  }).strict();

  const syncResult = strictObj.safeParse({ name: "asdf", unexpected: 13 });
  expect(syncResult.success).toEqual(false);

  const asyncResult = strictObj.safeParse({ name: "asdf", unexpected: 13 });
  expect(asyncResult.success).toEqual(false);
});

test("constructor key", () => {
  const person = s
    .object({
      name: s.string(),
    })
    .strict();

  expect(() =>
    person.parse({
      name: "bob dylan",
      constructor: 61,
    })
  ).toThrow();
});

test("constructor key", () => {
  const Example = s.object({
    prop: s.string(),
    opt: s.number().optional(),
    arr: s.array(s.string()),
  });

  type Example = s.infer<typeof Example>;
  assertEqualType<keyof Example, "prop" | "opt" | "arr">(true);
});

const personToExtend = s.object({
  firstName: s.string(),
  lastName: s.string(),
});

test("extend() should return schema with new key", () => {
  const PersonWithNickname = personToExtend.extend({ nickName: s.string() });
  type PersonWithNickname = s.infer<typeof PersonWithNickname>;

  const expected = { firstName: "f", nickName: "n", lastName: "l" };
  const actual = PersonWithNickname.parse(expected);

  expect(actual).toEqual(expected);
  assertEqualType<
    keyof PersonWithNickname,
    "firstName" | "lastName" | "nickName"
  >(true);
  assertEqualType<
    PersonWithNickname,
    { firstName: string; lastName: string; nickName: string }
  >(true);
});

test("extend() should have power to override existing key", () => {
  const PersonWithNumberAsLastName = personToExtend.extend({
    lastName: s.number(),
  });
  type PersonWithNumberAsLastName = s.infer<typeof PersonWithNumberAsLastName>;

  const expected = { firstName: "f", lastName: 42, nickName: 'asd' };
  const actual = PersonWithNumberAsLastName.parse(expected)

  expect(actual).toEqual(expected);
  assertEqualType<
    PersonWithNumberAsLastName,
    { firstName: string; lastName: number }
  >(true);
});

test("passthrough index signature", () => {
  const a = s.object({ a: s.string() });
  type a = s.infer<typeof a>;
  assertEqualType<{ a: string }, a>(true);
  const b = a.passthrough();
  type b = s.infer<typeof b>;
  assertEqualType<{ [k: string]: unknown }, b>(true);
});

test('[json schema] dependant requirements', () => {
  const Test1 = s.object({
    name: s.string(),
    credit_card: s.number(),
    billing_address: s.string(),
  }).requiredFor('name').dependentRequired({
    credit_card: ['billing_address'],
  })

  expect(Test1.schema).toMatchObject(
    {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "credit_card": { "type": "number" },
        "billing_address": { "type": "string" }
      },
      "required": ["name"],
      "dependentRequired": {
        "credit_card": ["billing_address"]
      }
    }
  );

  type Result = s.infer<typeof Test1>
  assertEqualType<Result, {
    credit_card?: number | undefined;
    name: string;
    billing_address: string;
  }>(true)

  const Test2 = s.object({
    name: s.string(),
    credit_card: s.number(),
    billing_address: s.string(),
  }).requiredFor('name').dependentRequired({
    credit_card: ["billing_address"],
    billing_address: ["credit_card"]
  })

  expect(Test2.schema).toMatchObject(
    {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "credit_card": { "type": "number" },
        "billing_address": { "type": "string" }
      },
      "required": ["name"],
      "dependentRequired": {
        "credit_card": ["billing_address"],
        "billing_address": ["credit_card"]
      }
    }
  )
})

test('optional properties', () => {
  const Test = s.object({
    qwe: s.string(),
  }).optionalProperties({
    asd: s.number(),
  })
  type T = s.infer<typeof Test>

  assertEqualType<T, {
    asd?: number;
    qwe: string;
  }>(true)
})
