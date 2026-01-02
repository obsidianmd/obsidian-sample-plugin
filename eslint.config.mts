import obsidianmd from "eslint-plugin-obsidianmd";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig(
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
	]),
	{
		files: [
			'**/*.js',
			'**/*.jsx',
			'**/*.cjs',
			'**/*.mjs',
			'**/*.ts',
			'**/*.tsx',
			'**/*.cts',
			'**/*.mts',
		],
		extends: obsidianmd.configs.recommended
	},
	{
		files: ['package.json'],
		extends: obsidianmd.configs.packageJson
	}
);
