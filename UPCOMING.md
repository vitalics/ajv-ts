# x.x.x

## 💥 Breaking Changes

## ✅ New Features

- [strict number](#strict-numbers)

### Strict numbers

We make validation for number `type`, `format`, `minValue` and `maxValue` fields. That means we handle it in our side so you get an error for invalid values.

Examples:

```ts
s.number().format('float').int() // error in type!
s.int().const(3.4) // error in type!
s.number().int().format('float') // error in format!
s.number().int().format('double') // error in format!

// ranges are also check for possibility

s.number().min(5).max(3) // error in range!
s.number().min(3).max(5).const(10) // error in constant - out of range!
```

## 🐛 Bug Fixes

- [#61](https://github.com/vitalics/ajv-ts/issues/61)

## 🏡 Chore/Infra

- add [type-fest](https://www.npmjs.com/package/type-fest) library for correct type checking
- add [tsx](https://www.npmjs.com/package/tsx) package
- add minified files for cjs and esm modules in `dist` folder
- remove `bun-types` dependency
