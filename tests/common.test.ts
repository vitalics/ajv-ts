import { test, expect } from 'bun:test';
import { s } from '../src'
import Ajv from 'ajv';

test('should support AJV custom ajv instance', () => {
  const newAjv = new Ajv()

  const newS = s.create(newAjv)

  const a = newS.number()

  expect(a.ajv).toBe(newAjv)
  expect(a.ajv).toBeInstanceOf(Ajv)
})

test('postProcess should should transform output result', () => {
  const myNum = s.number().postprocess(v => String(v))

  expect(myNum.parse(1)).toBe('1')
})

test('Native enum', () => {
  enum MyEnum {
    Red = 'red',
    Green = 'green',
    Blue = 'blue'
  }

  const en = s.enum(MyEnum)
})