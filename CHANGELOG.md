# ajv-ts

## 0.5.0

### Minor Changes

- cc5ef23: Minor release `0.5` is out!

  ## Installation/Update

  ```bash
  npm i ajv-ts@latest # npm
  yarn add ajv-ts@latest # yarn
  pnpm add ajv-ts@latest # pnpm
  bun add ajv-ts@latest # bun
  ```

  ## New Features

  ### not, exclude

  Now you can mark your schema with `not` keyword!

  Here is a 2 differences between `not` and `exclude`.

  - `not` method wrap given schema with `not`
  - `exclude(schema)` - add `not` keyword for incoming `schema` argument

  Example:

  ```ts
  import s from "ajv-ts";

  // not
  const notAString = s.string().not(); // or s.not(s.string())

  notAString.valid("random string"); // false, this is a string
  notAString.valid(123); // true

  // exclude
  const notJohn = s.string().exclude(s.const("John"));

  notJohn.valid("random string"); // true
  notJohn.valid("John"); // false, this is John

  // advanced usage

  const str = s.string<"John" | "Mary">().exclude(s.const("John"));
  s.infer<typeof str>; // 'Mary'
  ```

  ### keyof

  New function that can be used in a root. Same as `keyof T` in Typescript.

  **NOTE:** currenty works only with objects only, this behavior will be fixed in future releases.

  Example:

  ```ts
  import s from "ajv-ts";

  const keys = s.keyof(
    s.object({
      key1: s.string(),
      key2: s.object({}),
    })
  );

  type Result = s.infer<typeof keys>; // 'key1' | 'key2'

  keys.schema; // { anyOf: [ { cosnt: 'key1' }, {const: 'key2' } ] }
  ```

  ### Never

  Same as `never` type in Typescript. JSON-schema equivalent is `{not: {}}`.

  ## Fixes

  - `s.number()` - now generic!
  - `s.boolean()` - now generic!

  ### Array

  #### empty schema definition

  function can be called without schema definition

  ```ts
  import s from "ajv-ts";
  // before 0.5
  s.array(); // error

  // 0.5 and later
  s.array(); // OK, deinition is not required anymore!
  ```

  ### pushItems

  push(append) schema to array(parent) schema.

  Example:

  ```ts
  import s from "ajv-ts";

  const empty = s.array();
  const stringArr = empty.addItems(s.string());

  stringArr.schema; // {type: 'array', items: [{ type: 'string' }]}
  ```

  #### minContains/maxContains

  Improve typescript generics usage. Now you cannot set float or negative values.

  Example:

  ```ts
  import s from "ajv-ts";

  // Before 0.5
  s.array(s.number()).minContains(-1); // Typescript was silent

  // After 0.5
  s.array(s.number()).minContains(-1); // Typescript error: `Argument of type 'number' is not assignable to parameter of type '[never, 'TypeError: "minContains" should be positive integer', "Received: '-1'"]'.`
  ```

  ## JS Doc updates

  Update and add JS Doc for:

  - `nullable` - update
  - `array` - update
  - `validate` - update
  - `parse` - update
  - `number().const()` - update
  - `array().contains()` - add
  - `const()` - add
  - `any()` - update
  - `unknown` - update
  - `create` - update

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
