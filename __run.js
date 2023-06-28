import { setupStyleLanguage } from "../../adder-tools.js";
import { addImport, findImport, setDefaultDefaultExport, setDefault } from "../../ast-tools.js";
import { extension, postcssConfigCjsPath, stylesHint } from "./stuff.js";

/**
 * @param {import("../../ast-io.js").RecastAST} postcssConfigAst
 * @param {boolean} autoprefixer
 * @returns {import("../../ast-io.js").RecastAST}
 */
const updatePostcssConfig = (postcssConfigAst, autoprefixer) => {
	const configObject = setDefaultDefaultExport({
		cjs: true,
		defaultValue: {
			type: "ObjectExpression",
			properties: [],
		},
		typeScriptEstree: postcssConfigAst,
	});

	if (configObject.type !== "ObjectExpression") throw new Error("PostCSS config must be an object");

	const pluginsList = setDefault({
		default: /** @type {import("estree").ArrayExpression} */ ({
			type: "ArrayExpression",
			elements: [],
		}),
		object: configObject,
		property: "plugins",
	});

	if (pluginsList.type === "ArrayExpression") {
		if (autoprefixer) {
			let autoprefixerImportedAs = findImport({ cjs: true, package: "autoprefixer", typeScriptEstree: postcssConfigAst }).require;
			// Add an Autoprefixer import if it's not there
			if (!autoprefixerImportedAs) {
				autoprefixerImportedAs = "autoprefixer";
				addImport({ require: autoprefixerImportedAs, cjs: true, package: "autoprefixer", typeScriptEstree: postcssConfigAst });
			}
			pluginsList.elements.push({
				type: "Identifier",
				name: autoprefixerImportedAs,
			});
		}
	} else if (pluginsList.type === "ObjectExpression") {
		setDefault({
			default: {
				type: "ObjectExpression",
				properties: [],
			},
			object: pluginsList,
			property: "autoprefixer",
		});
	} else {
		throw new Error("`plugins` in PostCSS config must be an array or object");
	}

	return postcssConfigAst;
};

/** @type {import("../..").AdderRun<import("./__info.js").Options>} */
export const run = async ({ folderInfo, install, options, updateCss, updateJavaScript, updateSvelte }) => {
	await setupStyleLanguage({
		extension,
		folderInfo,
		mutateSveltePreprocessArgs() {},
		stylesHint,
		updateCss,
		updateJavaScript,
		updateSvelte,
	});

	await updateJavaScript({
		path: postcssConfigCjsPath,
		async script({ typeScriptEstree }) {
			return {
				typeScriptEstree: updatePostcssConfig(typeScriptEstree, options.autoprefixer),
			};
		},
	});

	await install({ package: "postcss" });
	await install({ package: "postcss-load-config" });

	if (!folderInfo.kit) await install({ package: "@sveltejs/vite-plugin-svelte" });

	if (options.autoprefixer) await install({ package: "autoprefixer" });
};
