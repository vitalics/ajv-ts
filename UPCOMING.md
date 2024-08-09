# x.x.x

Fixes:

- Issue [#57](https://github.com/vitalics/ajv-ts/issues/57) - `merge` construct schema with `undefined` fields.
- Extend don't update `def` property.
- Advanced TS type for `.array()` call.

Chore:

- remove benchmarks for now
- add more detailed bug report template

Infra:

- Configure vitest config file for testing and enable github actions reporter for CI
- Add `tsx` package for inspection.
- Update launch.json file for vscode debugger

Tests:

- add [#57](https://github.com/vitalics/ajv-ts/issues/57) issue test for `object` type.
