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
      branches: 60,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // CI-specific configurations
  maxWorkers: process.env.CI ? 1 : "50%",
  workerIdleMemoryLimit: "512MB",
  // Increase timeouts for CI
  testTimeout: 30000,
  // Isolate modules between tests
  resetModules: true,
  clearMocks: true,
};

export default config;
