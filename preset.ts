import { Preset, color } from "apply";

const newPreprocessor = `sveltePreprocess({
			defaults: {
				style: "postcss",
			},
			postcss: true
		})`

const addPreprocessor = (otherPreprocessors) => `preprocess: [
		${newPreprocessor},
		${otherPreprocessors}]`;

const snowpackPostcssPlugin = `[
			'@snowpack/plugin-build-script',
			{
				cmd: "postcss",
				input: [".css", ".pcss"],
				output: [".css"],
			}
		],
	`;

const addSnowpackPlugin = (otherPlugins) => `plugins: [
		${snowpackPostcssPlugin}
		${otherPlugins}
	]`;

Preset.setName("svelte-add/postcss");

const VITE = "vite";
const SNOWPACK = "snowpack";
const BUILD_TOOL = "buildTool";
Preset.option(BUILD_TOOL, VITE);

const EXCLUDE_EXAMPLES = "excludeExamples"
Preset.option(EXCLUDE_EXAMPLES, false);

Preset.extract("postcss.config.cjs").withTitle("Adding PostCSS config");
Preset.group((preset) => {
	preset.extract("src/routes/_global.pcss").ifOptionEquals(BUILD_TOOL, SNOWPACK);
	preset.extract("src/global.css").ifOptionEquals(BUILD_TOOL, VITE);
}).withTitle("Adding global PostCSS stylesheet");

Preset.group((preset) => {
	preset.extract("src/routes/$layout.svelte");
	const GLOBAL_CSS = "__PLACEHOLDER__GLOBAL_CSS__";
	preset.edit(["src/routes/$layout.svelte"]).update((content) => content.replace(GLOBAL_CSS, "./_global.pcss")).ifOptionEquals(BUILD_TOOL, SNOWPACK);
	preset.edit(["src/routes/$layout.svelte"]).update((content) => content.replace(GLOBAL_CSS, "../global.css")).ifOptionEquals(BUILD_TOOL, VITE);
}).withTitle("Making $layout import the global stylesheet");

Preset.group((preset) => {
	preset.editJson("package.json").merge({
		devDependencies: {
			"@snowpack/plugin-build-script": "^2.1.0",
			"@snowpack/plugin-svelte": "^3.5.2",
			"snowpack": "^3.0.13",
		},
	}).ifOptionEquals(BUILD_TOOL, SNOWPACK);

	preset.editJson("package.json").merge({
		devDependencies: {
			"autoprefixer": "^10.2.5",
			"cssnano": "^4.1.10",
			"postcss": "^8.2.7",
			"postcss-cli": "^8.3.1",
			"postcss-load-config": "^3.0.1",
			"svelte-preprocess": "^4.6.9",
		},
	});
}).withTitle("Adding needed dependencies");

Preset.edit(["snowpack.config.cjs"]).update((content) => {
	let result = content;

	if (content.includes("plugins:")) {
		const matchPlugins = /plugins:[\s\r\n]\[[\s\r\n]*((?:.|\r|\n)+)[\s\r\n]*\]/m;
		result = result.replace(matchPlugins, (_match, otherPlugins) => {
			return addSnowpackPlugin(otherPlugins);
		});
	}

	if (!result.includes("plugins:")) result = result.replace("module.exports = {", `module.exports = {\n\t${addSnowpackPlugin("")},`);

	return result;
}).withTitle("Setting up global PostCSS builder").ifOptionEquals(BUILD_TOOL, SNOWPACK);

Preset.edit(["svelte.config.cjs"]).update((content) => {
	let result = content;

	const matchSveltePreprocess = /sveltePreprocess\((.*)\)/m;
	result = result.replace(matchSveltePreprocess, (_match, _oldOptions) => `[${newPreprocessor}]`);

	const matchPreprocessors = /preprocess:[\s\r\n]\[[\s\r\n]*((?:.|\r|\n)+)[\s\r\n]*\]/m;
	result = result.replace(matchPreprocessors, (_match, otherPreprocessors) => {
		if (otherPreprocessors.includes("sveltePreprocess")) return addPreprocessor("");
		return addPreprocessor(otherPreprocessors);
	});

	if (!result.includes("svelte-preprocess")) result = `const sveltePreprocess = require("svelte-preprocess");\n${result}`;
	if (!result.includes("sveltePreprocess(")) result = result.replace("module.exports = {", `module.exports = {\n\t${addPreprocessor("")},`);

	return result;
}).withTitle("Setting up Svelte preprocessor");


Preset.group((preset) => {
	preset.edit(["src/routes/index.svelte"]).update((match) => {
		let result = match;
		result = result.replace(`<style>`, `<style lang="postcss" style="css">`);
		return result;
	});

	preset.edit(["src/lib/Counter.svelte"]).update((match) => {
		let result = match;
		result = result.replace(`<style>`, `<style lang="postcss" style="css">`);
		return result;
	});
}).withTitle("Marking <style> blocks as explicitly PostCSS").ifNotOption(EXCLUDE_EXAMPLES);

Preset.instruct(`Run ${color.magenta("npm install")}, ${color.magenta("pnpm install")}, or ${color.magenta("yarn")} to install dependencies`);
