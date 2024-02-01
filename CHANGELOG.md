# ajv-ts

## 0.6.3

### Patch Changes

- f5b5403: patch release
- 3d0d56d: $schema in meta support(#49)
- 84fe084: fix: homepage link, organize imports, exports (#48)
- f5b5403: feature: array.element. Add tests for addItems (#47)
- 4421ac8 chore: npmignore (#45)
- 152ebfa add `shape` for zod compatibility (#44)
- 9f98286 Zod: expose literal function (#42)
- b315539 feature: expose nativeEnum to zod compatibility (#39)

## 0.6.2

### Patch Changes

- 37b57f2: make object schema accept object type.

  ## What's new

  ### Object

  make object schema accept generic object type.

  ```ts
  import s from "ajv-ts";
  type CustomObj = {
    name: string;
    age: number;
  };
  // Before
  const before = s.object<CustomObj>(); // error, accept another definition
  // After
  s.object<CustomObj>(); // OK now
  ```

  ### Zod compatibility

  `describe` - add `description` to your schema. This method for `zod` compatibility.

## 0.6.1

### Patch Changes

- 1c4b78b: - fix `default` behavior.

  Now you can pass `undefined` or `null` and your default values will be applies.

  **NOTE:** `default` keyword will be applied for `items` and `properties` definition. That means `default` keyword will works only for `object()` and `array()` builders. See in [ajv](https://ajv.js.org/guide/modifying-data.html#assigning-defaults) docs

  Example:

  ```ts
  import s from "ajv-ts";

  const Person = s.object({
    age: s.number().default(18),
  });

  // Before
  Person.parse({}); // throws error

  // Now
  Person.parse({}); // returns { age: 18 }, default value
  ```

  - `parse`, `safeParse` and `validate` now can be called without arguments.

  ```ts
  import s from "ajv-ts";

  // Before
  s.number().safeParse(); // Error, required at least 1 argument

  // After
  s.number().safeParse(); // ok now
  ```

  - expose default `Ajv` instance.

  - make `object` builder optional.

  Example:

  ```ts
  import s from "ajv-ts";
  // Before
  s.object(); // error, expected object
  // After
  s.object(); // OK, empty object definition
  ```

## 0.6.0

### Minor Changes

- 219c7b7: new method: `refine`.

  Inspired from `zod`. Set custom validation. Any result exept `undefined` will throws(or exposed for `safeParse` method).

  ```ts
  import s from "ajv-ts";
  // example: object with only 1 "active element"
  const Schema = s
    .object({
      active: s.boolean(),
      name: s.string(),
    })
    .array()
    .refine((arr) => {
      const subArr = arr.filter((el) => el.active === true);
      if (subArr.length > 1)
        throw new Error('Array should contains only 1 "active" element');
    });

  Schema.parse([
    { active: true, name: "some 1" },
    { active: true, name: "some 2" },
  ]); // throws Error: Array should contains only 1 "active" element
  ```

## 0.5.1

### Patch Changes

- 09c54ff: Add `async` keyword support

  example:

  ```ts
  const obj = s.object({}).async();

  obj.schema; // {type: 'object', $async: true}
  // make sync schema
  obj.sync(); // {type: 'object', $async: false}

  // or completely remove the `$async` keyword form schema
  obj.sync(true); // {type: 'object'}
  ```

  ## fixes/refactories

  - refactor `safeParse` logic.
  - update JSDoc for `default` method

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
