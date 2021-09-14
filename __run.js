import { setupStyleLanguage } from "../../adder-tools.js";
import { newTypeScriptEstreeAst } from "../../ast-io.js";
import { setPropertyValue } from "../../ast-tools.js";
import { extension, postcssConfigCjsPath, stylesHint } from "./stuff.js";

// TODO: only include autoprefixer and cssnano with examples
// or should it work like that??
// I want `postcss` without options to produce an empty plugins list
// but it still needs to be easy to get these plugins added
// (making them their own adders is probably annoying)
// is there a good way to handle that?
const postcssConfig = `
const autoprefixer = require("autoprefixer");
const cssnano = require("cssnano");

const mode = process.env.NODE_ENV;
const dev = mode === "development";

const config = {
	plugins: [
		autoprefixer(),

		!dev && cssnano({
			preset: "default",
		}),
	],
};

module.exports = config;
`;

/** @type {import("../../index.js").AdderRun<import("./__metadata.js").Options>} */
export const run = async ({ folderInfo, install, updateCss, updateJavaScript, updateSvelte }) => {
	await setupStyleLanguage({
		extension,
		folderInfo,
		mutateSveltePreprocessArgs(sveltePreprocessArgs) {
			setPropertyValue({
				object: sveltePreprocessArgs,
				property: "postcss",
				value: {
					type: "Literal",
					value: true,
				},
			});
		},
		stylesHint,
		updateCss,
		updateJavaScript,
		updateSvelte,
	});

	await updateJavaScript({
		path: postcssConfigCjsPath,
		async script({ typeScriptEstree }) {
			const postcssConfigAst = newTypeScriptEstreeAst(postcssConfig);

			typeScriptEstree.program.body = postcssConfigAst.program.body;

			return {
				typeScriptEstree,
			};
		},
	});

	await install({ package: "postcss" });
	await install({ package: "postcss-load-config" });
	await install({ package: "svelte-preprocess" });

	// TODO: move this to examples only
	await install({ package: "autoprefixer" });
	await install({ package: "cssnano" });
};
