// .eslintrc.js - Configuração corrigida (sem duplicação)

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint/eslint-plugin',
    'prettier',
    'import',
    'promise',
    'unused-imports',
  ],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:promise/recommended',
    'plugin:prettier/recommended',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [
    '.eslintrc.js', 
    'dist', 
    'dist/**/*',
    'node_modules', 
    'node_modules/**/*',
    'coverage', 
    'build', 
    'prisma/migrations',
    'prisma/migrations/**/*'
  ],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_',
    }],
    '@typescript-eslint/no-empty-function': 'warn',
    
    // APENAS UMA regra naming-convention (versão mais flexível)
    '@typescript-eslint/naming-convention': [
      'error',
      // Padrão geral
      {
        'selector': 'default',
        'format': ['camelCase']
      },
      // Tipos em PascalCase
      {
        'selector': 'typeLike',
        'format': ['PascalCase']
      },
      // Variáveis flexíveis
      {
        'selector': 'variable',
        'format': ['camelCase', 'UPPER_CASE', 'PascalCase']
      },
      // Parâmetros - permitir underscore inicial
      {
        'selector': 'parameter',
        'format': ['camelCase'],
        'leadingUnderscore': 'allow'
      },
      // Enum members em UPPER_CASE
      {
        'selector': 'enumMember',
        'format': ['UPPER_CASE']
      },
      // Parâmetros de constructor - permitir tanto com quanto sem underscore
      {
        'selector': 'parameterProperty',
        'format': ['camelCase'],
        'leadingUnderscore': 'allow'
      },
      // Propriedades privadas - permitir tanto com quanto sem underscore
      {
        'selector': 'memberLike',
        'modifiers': ['private'],
        'format': ['camelCase'],
        'leadingUnderscore': 'allow'
      },
      // Interfaces - PascalCase
      {
        'selector': 'interface',
        'format': ['PascalCase']
      },
      // Métodos e propriedades públicas - camelCase
      {
        'selector': ['method', 'property'],
        'modifiers': ['public'],
        'format': ['camelCase']
      },
      // Propriedades de objetos (para permitir nomes de API, etc.)
      {
        'selector': 'objectLiteralProperty',
        'format': null
      }
    ],

    // General rules
    'prettier/prettier': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-duplicate-imports': 'error',
    'no-multiple-empty-lines': ['error', { 'max': 1, 'maxEOF': 1 }],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-template': 'error',
    'quotes': ['error', 'single', { 'avoidEscape': true }],
    'semi': ['error', 'always'],
    
    // Import rules
    'import/order': [
      'error',
      {
        'groups': [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling', 'index']
        ],
        'newlines-between': 'always',
        'alphabetize': {
          'order': 'asc',
          'caseInsensitive': true
        }
      }
    ],
    'import/no-duplicates': 'error',
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',
    
    // Promise rules
    'promise/always-return': 'warn',
    'promise/catch-or-return': 'warn',
    
    // Unused imports
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        'vars': 'all',
        'varsIgnorePattern': '^_',
        'args': 'after-used',
        'argsIgnorePattern': '^_'
      }
    ],
    
    // NestJS specific
    'max-classes-per-file': ['error', 1],
  }
};