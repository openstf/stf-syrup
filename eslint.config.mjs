import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '.github/',
      'node_modules/',
      '**/*.d.ts',
      'index.js',
      'lib/**/*.js'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.mts'],
    extends: [tseslint.configs.recommended]
  },
  {
    files: ['index.ts', 'lib/**/*.ts'],
    rules: {
      // The sources are CommonJS modules with `export =`. Importing them with
      // `import x = require()` keeps the emitted declarations usable without
      // esModuleInterop, which a default import would not.
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    files: ['test/**/*.mts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.mocha }
    },
    rules: {
      // Chai assertions such as `expect(x).to.be.true` are expressions.
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  }
)
