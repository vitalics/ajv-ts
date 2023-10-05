import { test, expect } from 'bun:test'

import s from '../src'

const simpleStr = s.string()
const optionalStr = s.string().optional()
const uuid = s.string().uuid()
const mail = s.string().email()
test('should pass validation', () => {
  simpleStr.parse('')
  optionalStr.parse('')
  optionalStr.parse(null)

  expect(() => optionalStr.parse(undefined)).toThrow()
})
