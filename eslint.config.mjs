import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				sourceType: "module",
				parser: "@typescript-eslint/parser",
				project: "./tsconfig.json",
			},
			globals: {
				...globals.browser, ...globals.worker
			}
		},
		rules: {
			"no-unused-vars": "off",
			"no-prototype-bultins": "off",
			"no-self-compare": "warn",
			"no-eval": "error",
			"no-implied-eval": "error",
			"prefer-const": "off",
			"no-console": [
				"warn",
				{
					"allow": ["warn", "error", "debug"]
				}
			],
			"no-restricted-globals": [
				"error",
				{
					"name": "app",
					"message": "Avoid using the global app object. Instead use the reference provided by your plugin instance."
				}
			],
			"no-alert": "error",
			"no-undef": "error",
			"@typescript/eslint-ban-ts-comment": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					"args": "none"
				}
			],
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/await-thenable": "warn",
			"@typescript-eslint/no-invalid-this": "error",
			"@typescript-eslint/no-require-imports": "warn",
			"@typescript-eslint/no-var-requires": "off",
			"@typescript-eslint/no-unnecessary-boolean-literal-compare": "warn"
		}
	},
);
