import { test, expect } from 'bun:test'

import s from '../src'
import { assertEqualType } from '../src/utils';

test("type guard", () => {
  const str = s.string();

  const s1 = s.object({
    stringToNumber: str,
  });
  type t1 = s.input<typeof s1>;

  const data = { stringToNumber: "asdf" };
  const parsed = s1.safeParse(data);
  if (parsed.success) {
    assertEqualType<typeof data, t1>(true);
  }
});

test("test this binding", () => {
  const callback = (predicate: (val: string) => boolean) => {
    return predicate("hello");
  };

  expect(callback((value) => s.string().safeParse(value).success)).toBe(true); // true
  expect(callback((value) => s.string().safeParse(value).success)).toBe(true); // true
});
