import { Preset } from "apply";

const preprocessor = `preprocess: [
		sveltePreprocess({
			defaults: {
				style: "postcss",
			},
			postcss: true
		}),
	]`;

const snowpackSveltePlugin = `...require("@sveltejs/snowpack-config").plugins,
	`;

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
		"snowpack": "next",
		"svelte-preprocess": "^4.6.1",
	},
}).withTitle("Adding needed dependencies");

Preset.edit(["svelte.config.js"]).update((content) => {
	let result = content;

	if (content.includes("preprocess:")) {
		result = result.replace("preprocess: sveltePreprocess()", preprocessor);
	} else {
		result = `const sveltePreprocess = require` + `("svelte-preprocess");\n${result}`;
		result = result.replace("module.exports = {", `module.exports = {\n\t${preprocessor},`);
	}

	return result;
}).withTitle("Setting up Svelte preprocessor");

Preset.edit(["snowpack.config.js"]).update((content) => {
	let result = content;

	if (content.includes("plugins:")) {
		const matchPlugins = /plugins:[\s\n]\[[\s\n]*((?:.|\n)+)[\s\n]*\]/;
		result = result.replace(matchPlugins, (_match, otherPlugins) => {
			if (otherPlugins.includes("@snowpack/plugin-svelte")) return addSnowpackPlugin(otherPlugins);
			return addSnowpackPlugin(`${snowpackSveltePlugin}\n${otherPlugins}`);
		});
	} else {
		result = result.replace("extends:", `${addSnowpackPlugin(snowpackSveltePlugin)},\n\textends:`);
	}

	return result;
}).withTitle("Setting up global PostCSS builder");

Preset.installDependencies().ifUserApproves();
