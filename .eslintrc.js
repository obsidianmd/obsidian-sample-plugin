module.exports = {
	"root": true,
	"extends": [
		"plugin:obsidian/recommended"
	],
	"parser": "@typescript-eslint/parser",
	"parserOptions": {
		"project": "./tsconfig.json",
		"ecmaVersion": 2020,
		"sourceType": "module"
	},
	"env": {
		"browser": true,
		"node": false
	},
	"plugins": [
		"obsidian"
	],
	"rules": {

	}
}
