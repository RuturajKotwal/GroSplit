module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/types/**/*.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};
