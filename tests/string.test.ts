import { test, expect, assertType } from 'vitest'

import s from '../src'

const simpleStr = s.string()
const optionalStr = s.string().optional()

test('types', () => {
  // @ts-expect-error 
  s.string().length(4).max(2)
  // @ts-expect-error invalid range
  s.string().minLength(3).maxLength(1)
  assertType<s.infer<typeof optionalStr>>('qwe')
  assertType<s.infer<typeof optionalStr>>(undefined)
  // @ts-expect-error only string available
  assertType<s.infer<typeof optionalStr>>(123)
})

test('should pass validation', () => {
  simpleStr.parse('')
  optionalStr.parse('')
  optionalStr.parse(null)
  expect(() => optionalStr.parse(undefined)).toThrow()
})
