# ajv-ts

## 0.4.0

### Minor Changes

- 2b4dd9e: # Description

  Add support for custom error message for any error.

  Example:

  ```ts
  import s from "ajv-ts";

  const num = s.number().error("cannot be not a number");

  const res1 = num.safeParse("some random string");
  const res2 = num.safeParse("1.2");
  console.error(res1.error.message); // cannot be not a number
  console.error(res2.error.message); // cannot be not a number

  res1.error instanceof Error; // true
  ```

  ## What's new

  new feature: add support custom error message

  ## Fixes

  fix: issue with typescript [#21](https://github.com/vitalics/ajv-ts/issues/21)

  ## Thanks

  [@rjvim](https://github.com/rjvim) for submitting the issue

## 0.3.1

### Patch Changes

- bf9a916: Add generics parameters for number and string builders

## 0.3.0

### Minor Changes

- ca3b768: add `custom` method for base builder
  use `Prettify` for merging objects via `passthough` method

## 0.2.2

### Patch Changes

- 920dde5: remove integers

## 0.2.1

### Patch Changes

- b1ff91f: ## Changes

  add `array` invariant for any schema
  fix `intersection` and `union` types generation
  add `and` and `or` methods for common builder
  fix `pattern` method usage in string builder
  add JSDoc for `pattern` method in string builder
  fix reusing formats reusability for string builder
  add `UUID` and `Email` string types

## 0.2.0

### Minor Changes

- 52d376d: Add integer support. Add dependantRequired support for object. Add JSDoc with examples

## 0.1.4

### Patch Changes

- 4e7615f: remove extra dependencies

## 0.1.3

### Patch Changes

- 8f48260: add js doc

## 0.1.2

### Patch Changes

- 267b36a: Reduce bundle size
  fix string minLength schema builder

## 0.1.1

### Patch Changes

- df1c20c: reduce bundle size

## 0.1.0

### Minor Changes

- b78096f: Init package
