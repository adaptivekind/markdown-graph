const transformIgnores = [].join("|");
const config = {
  extensionsToTreatAsEsm: [".ts"],
  moduleDirectories: ["node_modules", "<rootDir>/"],
  testEnvironment: "jest-environment-jsdom",
  testMatch: ["**/*.test.ts"],
  transformIgnorePatterns: [`/node_modules/(?!${transformIgnores})`],
};

export default config;
