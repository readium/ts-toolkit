module.exports = {
    collectCoverageFrom: [
        "src/**/*.ts",
        "shared/src/**/*.ts"
    ],
    moduleNameMapper: {
        "^src/(.*)$": "<rootDir>/src/$1"
    },
    extensionsToTreatAsEsm: [".ts"],
    transform: {
        "^.+\\.(mt|t|cj|j)s$": ["ts-jest"]
    },
    testMatch: ["**/*.test.ts"],
    testEnvironment: "node",
    setupFiles: ["<rootDir>/jest.setup.js"],
    transformIgnorePatterns: ["/node_modules/(?!css-selector-generator)/"]
}