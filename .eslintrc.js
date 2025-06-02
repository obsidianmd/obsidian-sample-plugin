module.exports = {
	"root": true,
	"extends": [
		"plugin:obsidianmd/recommended"
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
		"obsidianmd"
	],
	"rules": {

	}
}
