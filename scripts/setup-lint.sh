#!/bin/bash

# Colors for console output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}============================================${NC}"
echo -e "${GREEN}ESLint and Prettier Setup${NC}"
echo -e "${YELLOW}============================================${NC}"

# Install ESLint and Prettier dependencies
echo -e "${YELLOW}Installing ESLint and Prettier dependencies...${NC}"
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install --save-dev eslint-config-prettier eslint-plugin-prettier prettier
npm install --save-dev eslint-plugin-import eslint-plugin-promise eslint-plugin-unused-imports

# Create ESLint configuration
echo -e "${YELLOW}Creating ESLint configuration...${NC}"
if [ -f ".eslintrc.js" ]; then
  echo -e "${GREEN}ESLint configuration already exists.${NC}"
else
  echo -e "${YELLOW}Creating .eslintrc.js...${NC}"
  cat > .eslintrc.js << 'EOL'
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
  ignorePatterns: ['.eslintrc.js', 'dist', 'node_modules', 'coverage'],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_',
    }],
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/naming-convention': [
      'error',
      {
        'selector': 'default',
        'format': ['camelCase']
      },
      {
        'selector': 'variable',
        'format': ['camelCase', 'UPPER_CASE']
      },
      {
        'selector': 'parameter',
        'format': ['camelCase'],
        'leadingUnderscore': 'allow'
      },
      {
        'selector': 'memberLike',
        'modifiers': ['private'],
        'format': ['camelCase'],
        'leadingUnderscore': 'require'
      },
      {
        'selector': 'typeLike',
        'format': ['PascalCase']
      },
      {
        'selector': 'enum',
        'format': ['PascalCase', 'UPPER_CASE']
      },
      {
        'selector': 'enumMember',
        'format': ['UPPER_CASE']
      },
      {
        'selector': 'interface',
        'format': ['PascalCase'],
        'prefix': ['I']
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
  },
};
EOL
fi

# Create Prettier configuration
echo -e "${YELLOW}Creating Prettier configuration...${NC}"
if [ -f ".prettierrc" ]; then
  echo -e "${GREEN}Prettier configuration already exists.${NC}"
else
  echo -e "${YELLOW}Creating .prettierrc...${NC}"
  cat > .prettierrc << 'EOL'
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "useTabs": false
}
EOL
fi

# Create ESLint ignore file
echo -e "${YELLOW}Creating ESLint ignore file...${NC}"
if [ -f ".eslintignore" ]; then
  echo -e "${GREEN}ESLint ignore file already exists.${NC}"
else
  echo -e "${YELLOW}Creating .eslintignore...${NC}"
  cat > .eslintignore << 'EOL'
dist
node_modules
coverage
.eslintrc.js
jest.config.js
prisma
*.d.ts
**/*.spec.ts
EOL
fi

# Update package.json scripts
echo -e "${YELLOW}Updating package.json scripts...${NC}"
node -e "
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Add or update scripts
packageJson.scripts = {
  ...packageJson.scripts,
  'lint': 'eslint \"{src,apps,libs,test}/**/*.ts\" --fix',
  'lint:check': 'eslint \"{src,apps,libs,test}/**/*.ts\"',
  'format:check': 'prettier --check \"src/**/*.ts\" \"test/**/*.ts\"',
  'check': 'npm run lint:check && npm run format:check',
};

// Write updated package.json
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
"

echo -e "${GREEN}ESLint and Prettier setup completed successfully!${NC}"
echo -e "${YELLOW}Run 'npm run lint' to lint your code and automatically fix issues.${NC}"
echo -e "${YELLOW}Run 'npm run check' to check your code for issues without fixing them.${NC}"