import { Preset } from "apply";

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

Preset.extract().withTitle("Adding PostCSS config, global PostCSS stylesheet, and making $layout use it");

Preset.editJson("package.json").merge({
	devDependencies: {
		"@snowpack/plugin-build-script": "^2.0.11",
		"@snowpack/plugin-svelte": "^3.4.0",
		"autoprefixer": "^10.1.0",
		"cssnano": "^4.1.10",
		"postcss": "^8.2.1",
		"postcss-load-config": "^3.0.0",
		"postcss-cli": "^8.3.1",
		"snowpack": "^3.0.10",
		"svelte-preprocess": "^4.6.1",
	},
}).withTitle("Adding needed dependencies");

Preset.edit(["svelte.config.cjs"]).update((content) => {
	let result = content;

	const matchSveltePreprocess = /sveltePreprocess\((.*)\)/m;
	result = result.replace(matchSveltePreprocess, (_match, _oldOptions) => `[${newPreprocessor}]`);

	const matchPreprocessors = /preprocess:[\s\n]\[[\s\n]*((?:.|\n)+)[\s\n]*\]/m;
	result = result.replace(matchPreprocessors, (_match, otherPreprocessors) => {
		if (otherPreprocessors.includes("sveltePreprocess")) return addPreprocessor("");
		return addPreprocessor(otherPreprocessors);
	});

	if (!result.includes("svelte-preprocess")) result = `const sveltePreprocess = require` + `("svelte-preprocess");\n${result}`;
	if (!result.includes("sveltePreprocess(")) result = result.replace("module.exports = {", `module.exports = {\n\t${addPreprocessor("")},`);

	return result;
}).withTitle("Setting up Svelte preprocessor");

Preset.edit(["snowpack.config.cjs"]).update((content) => {
	let result = content;

	if (content.includes("plugins:")) {
		const matchPlugins = /plugins:[\s\n]\[[\s\n]*((?:.|\n)+)[\s\n]*\]/m;
		result = result.replace(matchPlugins, (_match, otherPlugins) => {
			return addSnowpackPlugin(otherPlugins);
		});
	}


	if (!result.includes("plugins:")) result = result.replace("module.exports = {", `module.exports = {\n\t${addSnowpackPlugin("")},`);

	return result;
}).withTitle("Setting up global PostCSS builder");

Preset.installDependencies().ifUserApproves();
