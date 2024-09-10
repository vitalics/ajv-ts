import { build, Options } from 'tsup'

const common: Options = {
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  external: [],
  splitting: true,
  cjsInterop: true,
  dts: true,
  target: ['node18'],
  shims: true,
  tsconfig: './tsconfig.json',

}
// minify
await build({
  ...common,
  clean: true,
  minify: true,
  minifySyntax: true,
  minifyWhitespace: true,
  minifyIdentifiers: true,
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.min.cjs' : format === 'esm' ? `.min.mjs` : '.min.js',
    }
  },
})

await build({
  ...common,
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : format === 'esm' ? `.mjs` : '.js',
    }
  },
})
