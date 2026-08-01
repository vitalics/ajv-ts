import { assertType, test } from "vitest";
import s from "../src";

test("empty object schema is minimal", () => {
  const empty = s.object({});
  type Expected = { readonly type: "object" };
  assertType<Expected>(empty._schema);
  assertType<typeof empty._schema>({} as Expected);
});

test("object schema with properties exposes only type and properties", () => {
  const str = s.string();
  const user = s.object({ name: str });
  type Expected = {
    readonly type: "object";
    readonly properties: { readonly name: typeof str._schema };
  };
  assertType<Expected>(user._schema);
  assertType<typeof user._schema>({} as Expected);
});

test("required() on empty object stays minimal", () => {
  const empty = s.object({}).required();
  type Expected = {
    readonly type: "object";
  };
  assertType<Expected>(empty._schema);
  assertType<typeof empty._schema>({} as Expected);

  const str = s.string();
  const user = s.object({ name: str }).required();
  type ExpectedUser = {
    readonly type: "object";
    readonly properties: { readonly name: typeof str._schema };
    readonly required: readonly ["name"];
  };
  assertType<ExpectedUser>(user._schema);
  assertType<typeof user._schema>({} as ExpectedUser);
});

test("requiredFor() adds only the requested keys", () => {
  const str = s.string();
  const num = s.number();
  const user = s.object({ name: str, age: num }).requiredFor("name");
  type Expected = {
    readonly type: "object";
    readonly properties: {
      readonly name: typeof str._schema;
      readonly age: typeof num._schema;
    };
    readonly required: readonly ["name"];
  };
  assertType<Expected>(user._schema);
  assertType<typeof user._schema>({} as Expected);
});

test("requiredFor() appends new keys to existing required", () => {
  const str = s.string();
  const num = s.number();
  const user = s.object({ name: str, age: num }).requiredFor("name").requiredFor("age");
  type Expected = {
    readonly type: "object";
    readonly properties: {
      readonly name: typeof str._schema;
      readonly age: typeof num._schema;
    };
    readonly required: readonly ["name", "age"];
  };
  assertType<Expected>(user._schema);
  assertType<typeof user._schema>({} as Expected);
});

test("partial() removes the required key when none are required", () => {
  const str = s.string();
  const user = s.object({ name: str }).required().partial();
  type Expected = {
    readonly type: "object";
    readonly properties: { readonly name: typeof str._schema };
  };
  assertType<Expected>(user._schema);
  assertType<typeof user._schema>({} as Expected);
});

test("partialFor() removes keys from required", () => {
  const str = s.string();
  const num = s.number();
  const user = s.object({ name: str, age: num }).required().partialFor("name");
  type Expected = {
    readonly type: "object";
    readonly properties: {
      readonly name: typeof str._schema;
      readonly age: typeof num._schema;
    };
    readonly required: readonly ["age"];
  };
  assertType<Expected>(user._schema);
  assertType<typeof user._schema>({} as Expected);
});

test("strict() adds additionalProperties=false lazily", () => {
  const strict = s.object({}).strict();
  type Expected = {
    readonly type: "object";
    readonly additionalProperties: false;
  };
  assertType<Expected>(strict._schema);
  assertType<typeof strict._schema>({} as Expected);
});

test("passthrough() adds additionalProperties=true lazily", () => {
  const pass = s.object({}).passthrough();
  type Expected = {
    readonly type: "object";
    readonly additionalProperties: true;
  };
  assertType<Expected>(pass._schema);
  assertType<typeof pass._schema>({} as Expected);
});

test("rest() adds additionalProperties from the given schema", () => {
  const num = s.number();
  const rest = s.object({}).rest(num);
  type Expected = {
    readonly type: "object";
    readonly additionalProperties: typeof num._schema;
  };
  assertType<Expected>(rest._schema);
  assertType<typeof rest._schema>({} as Expected);
});

test("readonly() adds readOnly lazily", () => {
  const ro = s.object({}).readonly();
  type Expected = {
    readonly type: "object";
    readonly readOnly: true;
  };
  assertType<Expected>(ro._schema);
  assertType<typeof ro._schema>({} as Expected);
});

test("dependentRequired() adds dependentRequired lazily", () => {
  const str = s.string();
  const num = s.number();
  const dep = s.object({ name: str, age: num }).dependentRequired({
    name: ["age"] as const,
  });
  type Expected = {
    readonly type: "object";
    readonly properties: {
      readonly name: typeof str._schema;
      readonly age: typeof num._schema;
    };
    readonly dependentRequired: {
      readonly name: readonly ["age"];
    };
  };
  assertType<Expected>(dep._schema);
  assertType<typeof dep._schema>({} as Expected);
});

test("extend() merges properties and keeps the schema minimal", () => {
  const str = s.string();
  const num = s.number();
  const base = s.object({ name: str });
  const extended = base.extend({ age: num });
  type Expected = {
    readonly type: "object";
    readonly properties: {
      readonly name: typeof str._schema;
      readonly age: typeof num._schema;
    };
  };
  assertType<Expected>(extended._schema);
  assertType<typeof extended._schema>({} as Expected);
});

test("merge() merges two object schemas", () => {
  const str = s.string();
  const num = s.number();
  const a = s.object({ name: str });
  const b = s.object({ age: num });
  const merged = a.merge(b);
  type Shape = {
    readonly type: "object";
    readonly properties: {
      readonly name: typeof str._schema;
      readonly age: typeof num._schema;
    };
  };
  assertType<typeof merged._schema>({} as Shape);
  assertType<{ name: string; age: number }>({} as typeof merged._output);
});

test("pick() keeps only selected properties", () => {
  const str = s.string();
  const num = s.number();
  const picked = s.object({ name: str, age: num }).pick("name");
  type Expected = {
    readonly type: "object";
    readonly properties: { readonly name: typeof str._schema };
  };
  assertType<Expected>(picked._schema);
  assertType<typeof picked._schema>({} as Expected);
});

test("omit() removes selected properties", () => {
  const str = s.string();
  const num = s.number();
  const omitted = s.object({ name: str, age: num }).omit("age");
  type Expected = {
    readonly type: "object";
    readonly properties: { readonly name: typeof str._schema };
  };
  assertType<Expected>(omitted._schema);
  assertType<typeof omitted._schema>({} as Expected);
});

test("array() converts object schema to array schema", () => {
  const str = s.string();
  const arr = s.object({ name: str }).array();
  type Expected = {
    readonly type: "array";
    readonly items: {
      readonly type: "object";
      readonly properties: { readonly name: typeof str._schema };
    };
  };
  assertType<Expected>(arr._schema);
  assertType<typeof arr._schema>({} as Expected);
});

test("keyof() creates an enum of object keys", () => {
  const str = s.string();
  const num = s.number();
  const keys = s.object({ name: str, age: num }).keyof();
  assertType<"name" | "age">(keys._output);
});

test("chaining methods keeps the schema type minimal", () => {
  const str = s.string();
  const user = s
    .object({ name: str })
    .required()
    .strict()
    .readonly();
  type Expected = {
    readonly type: "object";
    readonly properties: { readonly name: typeof str._schema };
    readonly required: readonly ["name"];
    readonly additionalProperties: false;
    readonly readOnly: true;
  };
  assertType<Expected>(user._schema);
  assertType<typeof user._schema>({} as Expected);
});
