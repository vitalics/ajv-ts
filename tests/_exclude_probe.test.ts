import { expect, test } from "vitest";
import s from "../src";

test("exclude probe", () => {
  const res = s.string().exclude(s.const("Jerry"));
  expect(res.schema).toMatchObject({
    type: "string",
    not: { const: "Jerry" },
  });
});
