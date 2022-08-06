/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ["<rootDir>"],
	moduleNameMapper: {
		"obsidian": "<rootDir>/node_modules/obsidian/obsidian.d.ts"
	},
	transformIgnorePatterns: [
		'node_modules/(?!obsidian/.*)'
	]
};
