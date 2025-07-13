const transformIgnores = [].join("|");
const config = {
  extensionsToTreatAsEsm: [".ts"],
  moduleDirectories: ["node_modules", "<rootDir>/"],
  testEnvironment: "jest-environment-jsdom",
  testMatch: ["**/*.test.ts"],
  transformIgnorePatterns: [`/node_modules/(?!${transformIgnores})`],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.d.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};

export default config;
