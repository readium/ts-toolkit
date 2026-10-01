module.exports = {
    moduleNameMapper: {
        "^@readium/helpers$": "<rootDir>/../helpers/src/index.ts",
        "^@readium/shared$": "<rootDir>/../shared/src/index.ts"
    },
    transform: {
        "^.+\\.(mt|t|cj|j)s$": ["ts-jest", { tsconfig: "tsconfig.test.json" }]
    },
    testMatch: ["**/*.test.ts"],
    testEnvironment: "<rootDir>/jest.environment.cjs",
    transformIgnorePatterns: ["/node_modules/(?!(\\.pnpm/)?css-selector-generator)"]
}
