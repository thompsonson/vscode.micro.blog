const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig({
	files: 'out/test/regression/**/*.test.js',
	workspaceFolder: './test-workspace',
	mocha: {
		ui: 'tdd',
		timeout: 20000
	}
});