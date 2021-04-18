import { Preset, color } from "apply";

const newPreprocessor = `sveltePreprocess({
			defaults: {
				style: "postcss",
			},
			postcss: true
		})`

const addPreprocessor = (otherPreprocessors) => {
	if (otherPreprocessors) {
		// otherPreprocessors includes captured whitespace at the end.
		// So, this will match the existing formatting, putting the closing ] 
		// bracket on a new line only if it already was
		return `preprocess: [\n\t\t${newPreprocessor},\n\t\t${otherPreprocessors}]`;
	} else {
		return `preprocess: [\n\t\t${newPreprocessor},\n\t]`;
	}
}

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

const ROLLUP = "rollup"; // Not currently supported or inferred
const ROLLUP_SAPPER = "rollup-sapper"; // Not currently supported or inferred
const SNOWPACK = "snowpack"; // Not tested
const SNOWPACK_SVELTEKIT = "snowpack-sveltekit";
const WEBPACK = "webpack"; // Not currently supported or inferred
const WEBPACK_SAPPER = "webpack-sapper"; // Not currently supported or inferred
const VITE = "vite";
const VITE_SVELTEKIT = "vite-sveltekit";
const UNKNOWN_SETUP = "unknown";
const SETUP = "setup";

const EXCLUDE_EXAMPLES = "excludeExamples"
Preset.option(EXCLUDE_EXAMPLES, false);

Preset.hook((preset) => { preset.context[SETUP] = UNKNOWN_SETUP }).withoutTitle();
Preset.edit("package.json").update((content, preset) => {
	const pkg = JSON.parse(content);

	const dependencies = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

	if (dependencies["@sveltejs/kit"]) {
		if (dependencies["vite"]) preset.context[SETUP] = VITE_SVELTEKIT;
		else if (dependencies["snowpack"]) preset.context[SETUP] = SNOWPACK_SVELTEKIT;
	} else if (dependencies["vite"]) {
		preset.context[SETUP] = VITE;
	} else if (dependencies["snowpack"]) {
		preset.context[SETUP] = SNOWPACK;
	}

	return content;
}).withoutTitle();

Preset.extract("postcss.config.cjs").withTitle("Adding PostCSS config");
Preset.group((preset) => {
	preset.extract("src/routes/_global.pcss").if((preset) => [SNOWPACK_SVELTEKIT].includes(preset.context[SETUP]));
	preset.extract("src/global.postcss").if((preset) => [VITE].includes(preset.context[SETUP]));

	preset.delete(["src/app.css"]).if((preset) => [VITE_SVELTEKIT].includes(preset.context[SETUP]));
	preset.extract("src/app.postcss").if((preset) => [VITE_SVELTEKIT].includes(preset.context[SETUP]));
}).withTitle("Adding global PostCSS stylesheet");

Preset.group((preset) => {
	preset.extract("src/routes/$layout.svelte").whenConflict("skip").if((preset) => [VITE_SVELTEKIT, SNOWPACK_SVELTEKIT].includes(preset.context[SETUP]));
	const GLOBAL_CSS = "__PLACEHOLDER__GLOBAL_CSS__";
	const APP_CSS = "../app.css";
	preset.edit("src/routes/$layout.svelte").update((content) => content.replace(GLOBAL_CSS, "./_global.pcss")).if((preset) => [SNOWPACK_SVELTEKIT].includes(preset.context[SETUP]));
	preset
    .edit("src/routes/$layout.svelte")
    .update((content) =>
      content
        .replace(GLOBAL_CSS, "../app.postcss")
        .replace(APP_CSS, "../app.postcss")
    )
    .if((preset) => [VITE_SVELTEKIT].includes(preset.context[SETUP]));
	preset.edit(["src/main.js", "src/main.ts"]).update((content) => {
		return `import "./global.postcss"\n${content}`;	
	}).if((preset) => [VITE].includes(preset.context[SETUP]));
}).withTitle("Importing the global stylesheet");

Preset.group((preset) => {
	preset.editJson("package.json").merge({
		devDependencies: {
			"@snowpack/plugin-build-script": "^2.1.0",
			"postcss-cli": "^8.3.1",
		},
	}).if((preset) => [SNOWPACK_SVELTEKIT, SNOWPACK].includes(preset.context[SETUP]));

	preset.editJson("package.json").merge({
		devDependencies: {
			"autoprefixer": "^10.2.5",
			"cssnano": "^5.0.0",
			"postcss": "^8.2.10",
			"postcss-load-config": "^3.0.1",
			"svelte-preprocess": "^4.7.0",
		},
	});
}).withTitle("Adding needed dependencies");

Preset.edit("snowpack.config.cjs").update((content) => {
	let result = content;

	if (content.includes("plugins:")) {
		const matchPlugins = /plugins:[\s\r\n]\[[\s\r\n]*((?:.|\r|\n)+)[\s\r\n]*\]/m;
		result = result.replace(matchPlugins, (_match, otherPlugins) => {
			return addSnowpackPlugin(otherPlugins);
		});
	}

	if (!result.includes("plugins:")) result = result.replace("module.exports = {", `module.exports = {\n\t${addSnowpackPlugin("")},`);

	return result;
}).withTitle("Setting up global PostCSS builder").if((preset) => [SNOWPACK_SVELTEKIT].includes(preset.context[SETUP]));

Preset.group((preset) => {
	preset.extract("svelte.config.cjs").whenConflict("skip").withTitle("Adding `svelte.config.cjs`").if((preset) => [VITE].includes(preset.context[SETUP]));

	preset.edit("svelte.config.cjs").update((content) => {
		let result = content;

		const matchEmptySveltePreprocess = /sveltePreprocess\(\)/m;
		result = result.replace(matchEmptySveltePreprocess, (_match) => `[${newPreprocessor}]`);

		const matchPreprocessors = /preprocess:[\s\r\n]\[[\s\r\n]*((?:.|\r|\n)+)[\s\r\n]*\]/m;
		result = result.replace(matchPreprocessors, (_match, otherPreprocessors) => {
			if (otherPreprocessors.includes("sveltePreprocess")) return addPreprocessor("");
			return addPreprocessor(otherPreprocessors);
		});

		if (!result.includes("svelte-preprocess")) result = `const sveltePreprocess = require("svelte-preprocess");\n${result}`;
		if (!result.includes("sveltePreprocess(")) result = result.replace("module.exports = {", `module.exports = {\n\t${addPreprocessor("")},`);

		return result;
	}).withTitle("Configuring it in svelte.config.cjs")
}).withTitle("Setting up Svelte preprocessor");

Preset.group((preset) => {
	preset.edit(["src/routes/index.svelte", "src/App.svelte", "src/lib/Counter.svelte"]).update((match) => {
		let result = match;
		result = result.replace(`<style>`, `<style style lang="postcss">`);
		return result;
	});
}).withTitle("Marking <style> blocks as explicitly PostCSS").ifNotOption(EXCLUDE_EXAMPLES);

Preset.instruct(`Run ${color.magenta("npm install")}, ${color.magenta("pnpm install")}, or ${color.magenta("yarn")} to install dependencies`);
