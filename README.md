# ajv-ts

## Table of Contents

- [ajv-ts](#ajv-ts)
  - [Table of Contents](#table-of-contents)
  - [Zod unsupported APIs/differences](#zod-unsupported-apisdifferences)
  - [Installation](#installation)
  - [Basic usage](#basic-usage)
  - [Primitives](#primitives)
  - [Constant values(literals)](#constant-valuesliterals)
  - [String](#string)
  - [Numbers](#numbers)
  - [BigInts](#bigints)
  - [NaNs](#nans)
  - [Dates](#dates)
  - [Enums](#enums)
    - [Autocompletion](#autocompletion)
  - [Native enums](#native-enums)
  - [Optionals](#optionals)
  - [Nullables](#nullables)
  - [Objects](#objects)
    - [`.keyof`](#keyof)
    - [`.extend`](#extend)
    - [`.merge`](#merge)
    - [`.pick`/`.omit`](#pickomit)
    - [`.partial`](#partial)
    - [`.required`](#required)
    - [`.requiredFor`](#requiredfor)
    - [`.partialFor`](#partialfor)
    - [`.passthrough`](#passthrough)
    - [`.strict`](#strict)
    - [`.dependentRequired`](#dependentrequired)
    - [`.rest`](#rest)
  - [Arrays](#arrays)
    - [`.addItems`](#additems)
    - [`.element`](#element)
    - [`.nonempty`](#nonempty)
    - [`.min`/`.max`/`.length`/`.minLength`/`.maxLength`](#minmaxlengthminlengthmaxlength)
    - [`.unique`](#unique)
    - [`.contains`/`.minContains`](#containsmincontains)
  - [Tuples](#tuples)
  - [unions/or](#unionsor)
  - [Intersections/and](#intersectionsand)
  - [Set](#set)
  - [Map](#map)
  - [`any`/`unknown`](#anyunknown)
  - [`never`](#never)
  - [`not`/`exclude`](#notexclude)
  - [Custom Ajv instance](#custom-ajv-instance)
  - [`custom` shema definition](#custom-shema-definition)
  - [Transformations](#transformations)
    - [Preprocess](#preprocess)
    - [Postprocess](#postprocess)

JSON schema builder like in ZOD-like API

> TypeScript schema validation with static type inference!

Reasons to install `ajv-ts` instead of `zod`

1. Less code. `zod` has 4k+ lines of code
2. not JSON-schema compatibility out of box (but you can install some additional plugins)
3. we not use own parser, just `ajv`, which wild spreadable(90M week installations for `ajv` vs 5M for `zod`)
4. Same typescript types and API

We inspired API from `zod`. So you just can reimport you api and that's it!

## Zod unsupported APIs/differences

1. `s.date`, `s.symbol`, `s.void`, `s.void`, `s.bigint`, `s.function` does not supported. Since JSON-schema doesn't define `Date`, `Symbol`, `void`, `function`, `Set`, `Map` as separate type. For strings you can use `s.string().format('date-time')` or other JSON-string format compatibility: https://json-schema.org/understanding-json-schema/reference/string.html
2. `s.null` === `s.undefined` - same types, but helps typescript with autocompletion
3. `z.enum` and `z.nativeEnum` it's a same as `s.enum`. We make enums fully compatible, it can be array of strings or structure defined with `enum` keyword in typescript
4. Exporting `s` isntead of `z`, since `s` - is a shorthand for `schema`
5. `z.custom` is not supported
6. `z.literal` === `s.const`.

## Installation

```bash
npm install ajv-ts       # npm
yarn add ajv-ts          # yarn
bun add ajv-ts           # bun
pnpm add ajv-ts          # pnpm
```

## Basic usage

Creating a simple string schema

```typescript
import { s } from "ajv-ts";

// creating a schema for strings
const mySchema = s.string();

// parsing
mySchema.parse("tuna"); // => "tuna"
mySchema.parse(12); // => throws Ajv Error

// "safe" parsing (doesn't throw error if validation fails)
mySchema.safeParse("tuna"); // => { success: true; data: "tuna" }
mySchema.safeParse(12); // => { success: false; error: AjvError }
```

Creating an object schema

```ts
import { s } from "ajv-ts";

const User = s.object({
  username: s.string(),
});

User.parse({ username: "Ludwig" });

// extract the inferred type
type User = s.infer<typeof User>;
// { username: string }
```

## Primitives

```ts
import { s } from "ajv-ts";

// primitive values
s.string();
s.number();
s.boolean();

// empty types
s.undefined();
s.null();

// allows any value
s.any();
s.unknown();
```

## Constant values(literals)

```ts
const tuna = s.const("tuna");
const twelve = s.const(12);
const tru = s.const(true);

// retrieve literal value
tuna.value; // "tuna"
```

## String

includes a handful of string-specific validations.

```ts
// validations
s.string().maxLength(5);
s.string().minLength(5);
s.string().length(5);
s.string().format('email');
s.string().format('url');
s.string().regex(regex);
s.string().format('date-time');
s.string().format('ipv4');

// transformations
s.string().postprocess(v => v.trim());
s.string().postprocess(v => v.toLowerCase());
s.string().postprocess(v => v.toUpperCase());
```

## Numbers

includes a handful of number-specific validations.

```ts
s.number().gt(5);
s.number().gte(5); // alias .min(5)
s.number().lt(5);
s.number().lte(5); // alias .max(5)

s.number().int(); // value must be an integer

s.number().positive(); //     > 0
s.number().nonnegative(); //  >= 0
s.number().negative(); //     < 0
s.number().nonpositive(); //  <= 0

s.number().multipleOf(5); // Evenly divisible by 5. Alias .step(5)
```

## BigInts

Not supported

## NaNs

Not supported

## Dates

Not supported, but you can pass `parseDates` in your AJV instance.

## Enums

```ts
const FishEnum = s.enum(["Salmon", "Tuna", "Trout"]);
type FishEnum = s.infer<typeof FishEnum>;
// 'Salmon' | 'Tuna' | 'Trout'
```

```ts
const VALUES = ["Salmon", "Tuna", "Trout"] as const;
const FishEnum = s.enum(VALUES);
```

### Autocompletion

To get autocompletion with a enum, use the `.enum` property of your schema:

```ts
FishEnum.enum.Salmon; // => autocompletes

FishEnum.enum;
/*
=> {
  Salmon: "Salmon",
  Tuna: "Tuna",
  Trout: "Trout",
}
*/
```

You can also retrieve the list of options as a tuple with the .options property:

```ts
FishEnum.options; // ["Salmon", "Tuna", "Trout"];
```

## Native enums

**Numeric enums:**

```ts
enum Fruits {
  Apple,
  Banana,
}

const FruitEnum = s.enum(Fruits);
type FruitEnum = s.infer<typeof FruitEnum>; // Fruits

FruitEnum.parse(Fruits.Apple); // passes
FruitEnum.parse(Fruits.Banana); // passes
FruitEnum.parse(0); // passes
FruitEnum.parse(1); // passes
FruitEnum.parse(3); // fails
```

**String enums:**

```ts
enum Fruits {
  Apple = "apple",
  Banana = "banana",
  Cantaloupe, // you can mix numerical and string enums
}

const FruitEnum = s.enum(Fruits);
type FruitEnum = s.infer<typeof FruitEnum>; // Fruits

FruitEnum.parse(Fruits.Apple); // passes
FruitEnum.parse(Fruits.Cantaloupe); // passes
FruitEnum.parse("apple"); // passes
FruitEnum.parse("banana"); // passes
FruitEnum.parse(0); // passes
FruitEnum.parse("Cantaloupe"); // pass
```

**Const enums:**

The `.enum()` function works for as const objects as well. ⚠️ as const requires TypeScript 3.4+!

```ts
const Fruits = {
  Apple: "apple",
  Banana: "banana",
  Cantaloupe: 3,
} as const;

const FruitEnum = s.enum(Fruits);
type FruitEnum = s.infer<typeof FruitEnum>; // "apple" | "banana" | 3

FruitEnum.parse("apple"); // passes
FruitEnum.parse("banana"); // passes
FruitEnum.parse(3); // passes
FruitEnum.parse("Cantaloupe"); // fails
```

You can access the underlying object with the .enum property:

```ts
FruitEnum.enum.Apple; // "apple"
```

## Optionals

You can make any schema optional with `s.optional()`. This wraps the schema in a `Optional` instance and returns the result.

```ts
const schema = s.string().optional();

schema.parse(undefined); // => returns undefined
type A = s.infer<typeof schema>; // string | undefined
```

## Nullables

```ts
const nullableString = s.string().nullable();
nullableString.parse("asdf"); // => "asdf"
nullableString.parse(null); // => null
nullableString.parse(undefined); // throws error
```

## Objects

```ts
// all properties are required by default
const Dog = s.object({
  name: s.string(),
  age: s.number(),
});

// extract the inferred type like this
type Dog = s.infer<typeof Dog>;

// equivalent to:
type Dog = {
  name: string;
  age: number;
};
```

### `.keyof`

Use `.keyof` to create a `Enum` schema from the keys of an object schema.

```ts
const keySchema = Dog.keyof();
keySchema; // Enum<["name", "age"]>
```

### `.extend`

You can add additional fields to an object schema with the `.extend` method.

```ts
const DogWithBreed = Dog.extend({
  breed: s.string(),
});
```

You can use `.extend` to overwrite fields! Be careful with this power!

### `.merge`

Equivalent to `A.extend(B.schema)`.

```ts
const BaseTeacher = s.object({ students: s.array(s.string()) });
const HasID = s.object({ id: s.string() });

const Teacher = BaseTeacher.merge(HasID);
type Teacher = s.infer<typeof Teacher>; // => { students: string[], id: string }
```

### `.pick`/`.omit`

Inspired by TypeScript's built-in `Pick` and `Omit` utility types, all object schemas have `.pick` and `.omit` methods that return a modified version. Consider this Recipe schema:

```ts
const Recipe = s.object({
  id: s.string(),
  name: s.string(),
  ingredients: s.array(s.string()),
});
```

To only keep certain keys, use .pick .

```ts
const JustTheName = Recipe.pick({ name: true });
type JustTheName = s.infer<typeof JustTheName>;
// => { name: string }
```

To remove certain keys, use `.omit` .

```ts
const NoIDRecipe = Recipe.omit({ id: true });

type NoIDRecipe = s.infer<typeof NoIDRecipe>;
// => { name: string, ingredients: string[] }
```

### `.partial`

Inspired by the built-in TypeScript utility type `Partial`, the .partial method makes all properties optional.

Starting from this object:

```ts
const user = s.object({
  email: s.string(),
  username: s.string(),
});
// { email: string; username: string }
We can create a partial version:

const partialUser = user.partial();
// { email?: string | undefined; username?: string | undefined }
You can also specify which properties to make optional:

const optionalEmail = user.partial({
  email: true,
});
/*
{
  email?: string | undefined;
  username: string
}
*/
```

### `.required`

Contrary to the `.partial` method, the `.required` method makes all properties required.

Starting from this object:

```ts
const user = z
  .object({
    email: s.string(),
    username: s.string(),
  })
  .partial();
// { email?: string | undefined; username?: string | undefined }
```

We can create a required version:

```ts
const requiredUser = user.required();
// { email: string; username: string }
You can also specify which properties to make required:

const requiredEmail = user.required({
  email: true,
});
/*
{
  email: string;
  username?: string | undefined;
}
*/
```

### `.requiredFor`

Accepts keys which are required. Set `requiredProperties` for your JSON-schema

```ts
const O = s.object({
  first: s.number().optional(),
  second: s.string().optional()
}).requiredFor('first')

type O = s.infer<typeof O> // {first: number, second?: string}
```

### `.partialFor`

Accepts keys which are partial. unset properties from `required` schema field in your JSON-schema

```ts
const O = s.object({
  first: s.number().optional(),
  second: s.string().optional()
}).required().partialFor('second')

type O = s.infer<typeof O> // {first: number, second?: string}
```

### `.passthrough`

By default object schemas strip out unrecognized keys during parsing.

```ts
const person = s.object({
  name: s.string(),
});

person.parse({
  name: "bob dylan",
  extraKey: 61,
});
// => { name: "bob dylan" }
// extraKey has been stripped
```

Instead, if you want to pass through unknown keys, use `.passthrough()` .

```ts
person.passthrough().parse({
  name: "bob dylan",
  extraKey: 61,
});
// => { name: "bob dylan", extraKey: 61 }
```

### `.strict`

By default JSON object schemas allow to pass unrecognized keys during parsing. You can disallow unknown keys with `.strict()` . If there are any unknown keys in the input - will throw an error.

```ts
const person = z
  .object({
    name: s.string(),
  })
  .strict();

person.parse({
  name: "bob dylan",
  extraKey: 61,
});
// => throws ZodError
```

### `.dependentRequired`

The `dependentRequired` keyword conditionally requires that
certain properties must be present if a given property is
present in an object. For example, suppose we have a schema
representing a customer. If you have their "credit card number",
you also want to ensure you have a "billing address".
If you don't have their credit card number, a "billing address"
operty
on another using the `dependentRequired` keyword.
The value of the `dependentRequired` keyword is an object.
Each entry in the object maps from the name of a property, p,
to an array of strings listing properties that are `required`
if p is present.

```ts
const Test1 = s.object({
  name: s.string(),
  credit_card: s.number(),
  billing_address: s.string(),
  }).requiredFor('name').dependentRequired({
    credit_card: ['billing_address'],
  })

/**
Test1.schema === {
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
*/
```

### `.rest`

The `additionalProperties` keyword is used to control the handling of extra stuff, that is, `properties` whose names are
not listed in the `properties` keyword or match any of the regular expressions in the `patternProperties` keyword.
By default any additional properties are allowed.

If you need to set `additionalProperties=false` use [`strict`](#strict) method

```ts
const Test = s.object({
  street_name: s.string(),
  street_type: s.enum(["Street", "Avenue", "Boulevard"])
}).rest(s.string())

Test.schema === {
  "type": "object",
  "properties": {
    "street_name": { "type": "string" },
    "street_type": { "enum": ["Street", "Avenue", "Boulevard"] }
  },
  "additionalProperties": { "type": "string" }
}
```

## Arrays

```typescript
const stringArray = s.array(s.string());
type StringArray = s.infer<typeof stringArray> // string[]
```

Or it's invariant

```ts
const stringArray = s.string().array();
type StringArray = s.infer<typeof stringArray> // string[]
```

Or you can pass empty schema

```ts
const empty = s.array()

type Empty = s.infer<typeof empty> // unknown[]
```

### `.addItems`

push(append) schema to array(parent) schema.

Example:

```ts
import s from 'ajv-ts'

const empty = s.array()
const stringArr = empty.addItems(s.string())

stringArr.schema // {type: 'array', items: [{ type: 'string' }]}
```

### `.element`

Use `.element` to access the schema for an element of the array.

```ts
stringArray.element; // => string schema, not array schema
```

### `.nonempty`

If you want to ensure that an array contains at least one element, use `.nonempty()`.

```ts
const nonEmptyStrings = s.array(s.string()).nonempty();
// the inferred type is now
// [string, ...string[]]

nonEmptyStrings.parse([]); // throws: "Array cannot be empty"
nonEmptyStrings.parse(["Ariana Grande"]); // passes
```

### `.min`/`.max`/`.length`/`.minLength`/`.maxLength`

```ts
s.string().array().min(5); // must contain 5 or more items
s.string().array().max(5); // must contain 5 or fewer items
s.string().array().length(5); // must contain 5 items exactly
```

Unlike `.nonempty()` these methods do not change the inferred type.

### `.unique`

Set the `uniqueItems` keyword to `true`.

```ts
const UniqueNumbers = s.array(s.number()).unique()

UniqueNumbers.parse([1,2,3,4]) // Ok
UniqueNumbers.parse([1,2,3,3]) // Error
```

### `.contains`/`.minContains`

## Tuples

Unlike arrays, tuples have a fixed number of elements and each element can have a different type.

```ts
const athleteSchema = s.tuple([
  s.string(), // name
  s.number(), // jersey number
  s.object({
    pointsScored: s.number(),
  }), // statistics
]);

type Athlete = s.infer<typeof athleteSchema>;
// type Athlete = [string, number, { pointsScored: number }]
```

A variadic ("rest") argument can be added with the .rest method.

```ts
const variadicTuple = s.tuple([s.string()]).rest(s.number());
const result = variadicTuple.parse(["hello", 1, 2, 3]);
// => [string, ...number[]];
```

## unions/or

includes a built-in s.union method for composing "OR" types.

This function accepts array of schemas by spread argument.

```ts
const stringOrNumber = s.union(s.string(), s.number());

stringOrNumber.parse("foo"); // passes
stringOrNumber.parse(14); // passes
```

Or it's invariant - `or` function:

```ts
s.number().or(s.string()) // number | string
```

## Intersections/and

Intersections are "logical AND" types. This is useful for intersecting two object types.

```ts
const Person = s.object({
  name: s.string(),
});

const Employee = s.object({
  role: s.string(),
});

const EmployedPerson = s.intersection(Person, Employee);

// equivalent to:
const EmployedPerson = Person.and(Employee);

// equivalent to:
const EmployedPerson = and(Person, Employee);
```

Though in many cases, it is recommended to use `A.merge(B)` to merge two objects. The `.merge` method returns a new Object instance, whereas `A.and(B)` returns a less useful Intersection instance that lacks common object methods like `pick` and `omit`.

```ts
const a = s.union(s.number(), s.string());
const b = s.union(s.number(), s.boolean());
const c = s.intersection(a, b);

type c = s.infer<typeof c>; // => number
```

## Set

Not supported

## Map

Not supported

## `any`/`unknown`

Any and unknown defines `{}` (empty object) as JSON-schema. very useful if you need to create something specific

## `never`

Never defines using `{not: {}}` (empty not). Any given json schema will be fails.

## `not`/`exclude`

Here is a 2 differences between `not` and `exclude`.

- `not` method wrap given schema with `not`
- `exclude(schema)` - add `not` keyword for incoming `schema` argument

Example:

```ts
import s from 'ajv-ts'

// not
const notAString = s.string().not() // or s.not(s.string())

notAString.valid('random string') // false, this is a string
notAString.valid(123) // true

// exclude
const notJohn = s.string().exclude(s.const('John'))

notJohn.valid('random string') // true
notJohn.valid('John') // false, this is John

// advanced usage

const str = s.string<'John' | 'Mary'>().exclude(s.const('John'))
s.infer<typeof str> // 'Mary'
```

## Custom Ajv instance

If you need to create a custom AJV Instance, you can use `create` or `new` function.

```ts
import addKeywords from 'ajv-keywords';
import schemaBuilder from 'ajv-ts'

const myAjvInstance = new Ajv({parseDate: true})

export const s = schemaBuilder.create(myAjvInstance)

// later:
s.string().dateTime().parse(new Date()) // 2023-10-05T19:31:57.610Z
```

## `custom` shema definition

If you need to append something specific to you schema, you can use `custom` method.

```ts
const condition = s.any() // schema: {}

const withIf = condition.custom('if', {properties: {foo: {type: 'string'}}})

withIf.schema // {if: {properties: {foo: {type: 'string'}}}}

```

## Transformations

### Preprocess

function thant will be applied before calling `parse` method, It can helps you to modify incomining data

Be careful with this information

```ts
const ToString = s.string().preprocess(x => {
  if(x instanceof Date){
    return x.toISOString()
  }
  return x
}, s.string())

ToString.parse(12) // error: expects a string

ToString.parse(new Date()) // 2023-09-26T13:44:46.497Z

```

### Postprocess

function thant will be applied after calling `parse` method.

```ts
const ToString = s.number().postprocess(x => String(x), s.string())

ToString.parse(12) // after parse we get "12" 12 => "12". 

ToString.parse({}) // error: expects number. Postprocess has not been called
```
