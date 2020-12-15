import { Preset } from "use-preset";

const preprocessor = `preprocess: [
		sveltePreprocess({
			defaults: {
				style: "postcss",
			},
			postcss: true
		}),
	]`;


Preset.setName("svelte-add-postcss");

Preset.extract().withTitle("Adding PostCSS config, global PostCSS stylesheet, and making $layout use it");

Preset.editJson("package.json").merge({
	devDependencies: {
		"@snowpack/plugin-build-script": "^2.0.11",
		"cssnano": "^4.1.10",
		"postcss": "^8.1.6",
		"postcss-load-config": "^3.0.0",
		"postcss-cli": "^8.2.0",
		// https://github.com/babichjacob/svelte-add-tailwindcss/issues/1
		"snowpack": "2.17.0",
		"svelte-preprocess": "^4.5.2",
	},
	// https://github.com/babichjacob/svelte-add-tailwindcss/issues/1
	resolutions: {
		"snowpack": "2.17.0",
	}
}).withTitle("Adding needed dependencies");

Preset.edit(["svelte.config.js"]).update((match) => {
	let result = match;

	if (match.includes("preprocess:")) {
		result = result.replace("preprocess: sveltePreprocess()", preprocessor);
	} else {
		result = `const sveltePreprocess = require` + `("svelte-preprocess");\n${result}`;
		result = result.replace("module.exports = {", `module.exports = {\n\t${preprocessor},`);
	}

	return result;
}).withTitle("Setting up Svelte preprocessor");

Preset.edit(["snowpack.config.js"]).update((match) => {
	let result = match;

	if (match.includes("plugins:")) {
		result = result.replace(`plugins: ['@snowpack/plugin-typescript']`, `plugins: ['@snowpack/plugin-typescript', ["@snowpack/plugin-build-script", { "cmd": "postcss", "input": [".css", ".pcss"], "output": [".css"] }]]`)
	} else {
		result = result.replace("extends:", `plugins: [["@snowpack/plugin-build-script", { "cmd": "postcss", "input": [".css", ".pcss"], "output": [".css"] }]],\n\textends:`);
	}

	return result;
}).withTitle("Setting up global PostCSS builder");

Preset.installDependencies().ifUserApproves();
