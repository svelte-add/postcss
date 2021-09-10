import { walk } from "estree-walker";
import { Comment } from "postcss";
import { newTypeScriptEstreeAst } from "../../ast-io.js";
import { addImport, findImport, getConfigObject, getPreprocessArray, getSveltePreprocessArgs } from "../../ast-tools.js";
import { globalStylesheetCssPath, globalStylesheetCssRelativePath, globalStylesheetCssRelativeVitePath, globalStylesheetPostcssPath, globalStylesheetPostcssRelativePath, globalStylesheetPostcssRelativeVitePath, postcssConfigCjsPath, stylesHint } from "./stuff.js";

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

/**
 * @param {import("../../ast-io.js").RecastAST} svelteConfigAst
 * @param {boolean} cjs
 * @returns {import("../../ast-io.js").RecastAST}
 */
const updateSvelteConfig = (svelteConfigAst, cjs) => {
	const sveltePreprocessImports = findImport({ cjs, package: "svelte-preprocess", typeScriptEstree: svelteConfigAst });
	let sveltePreprocessImportedAs = cjs ? sveltePreprocessImports.require : sveltePreprocessImports.default;

	// Add a svelte-preprocess import if it's not there
	if (!sveltePreprocessImportedAs) {
		sveltePreprocessImportedAs = "preprocess";
		addImport({ require: sveltePreprocessImportedAs, cjs, default: sveltePreprocessImportedAs, package: "svelte-preprocess", typeScriptEstree: svelteConfigAst });
	}

	const configObject = getConfigObject({ cjs, typeScriptEstree: svelteConfigAst });

	const preprocessArray = getPreprocessArray({ configObject });
	const sveltePreprocessArgs = getSveltePreprocessArgs({ preprocessArray, sveltePreprocessImportedAs });

	// Add postcss: true to svelte-preprocess options
	/** @type {import("estree").Property} */
	const postcssTrueProperty = {
		type: "Property",
		computed: false,
		key: {
			type: "Literal",
			value: "postcss",
		},
		kind: "init",
		method: false,
		shorthand: false,
		value: {
			type: "Literal",
			value: true,
		},
	};
	sveltePreprocessArgs.properties.push(postcssTrueProperty);

	return svelteConfigAst;
};

/** @type {import("../../index.js").AdderRun<import("./__metadata.js").Options>} */
export const run = async ({ folderInfo, install, updateCss, updateJavaScript, updateSvelte }) => {
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

	if (folderInfo.packageType === "module")
		await updateJavaScript({
			path: "/svelte.config.js",
			async script({ typeScriptEstree }) {
				return {
					typeScriptEstree: updateSvelteConfig(typeScriptEstree, false),
				};
			},
		});
	else
		await updateJavaScript({
			path: "/svelte.config.cjs",
			async script({ typeScriptEstree }) {
				return {
					typeScriptEstree: updateSvelteConfig(typeScriptEstree, true),
				};
			},
		});

	await updateCss({
		path: globalStylesheetCssPath,
		async style({ postcss: appCss }) {
			await updateCss({
				path: globalStylesheetPostcssPath,
				async style({ postcss: appPostcss }) {
					appPostcss.prepend(appCss);

					appPostcss.prepend(
						new Comment({
							text: stylesHint,
						})
					);

					return {
						postcss: appPostcss,
					};
				},
			});

			return {
				exists: false,
			};
		},
	});

	/**
	 * @param {object} param0
	 * @param {import("../../ast-io.js").RecastAST} param0.typeScriptEstree
	 * @param {string[]} param0.inputs
	 * @param {string} param0.output
	 */
	const updateOrAddAppStylesImport = ({ typeScriptEstree, inputs, output }) => {
		/** @type {import("estree").ImportDeclaration | undefined} */
		let appStylesImport;

		walk(typeScriptEstree, {
			enter(node) {
				if (node.type !== "ImportDeclaration") return;

				/** @type {import("estree").ImportDeclaration} */
				// prettier-ignore
				const importDeclaration = (node)

				if (typeof importDeclaration.source.value !== "string") return;

				if (!inputs.includes(importDeclaration.source.value)) return;

				appStylesImport = importDeclaration;
			},
		});

		if (!appStylesImport) {
			appStylesImport = {
				type: "ImportDeclaration",
				source: {
					type: "Literal",
					value: output,
				},
				specifiers: [],
			};
			typeScriptEstree.program.body.unshift(appStylesImport);
		}

		appStylesImport.source.value = output;
	};

	if (folderInfo.kit)
		await updateSvelte({
			path: "/src/routes/__layout.svelte",

			async markup({ posthtml }) {
				const slot = posthtml.some((node) => typeof node !== "string" && typeof node !== "number" && node.tag === "slot");

				if (!slot) posthtml.push("\n", { tag: "slot" });

				return {
					posthtml,
				};
			},

			async script({ lang, typeScriptEstree }) {
				updateOrAddAppStylesImport({
					typeScriptEstree,
					inputs: [globalStylesheetCssRelativePath],
					output: globalStylesheetPostcssRelativePath,
				});

				return {
					lang,
					typeScriptEstree,
				};
			},
		});
	else {
		await updateJavaScript({
			path: "/src/main.js",
			async script({ exists, typeScriptEstree }) {
				if (!exists) return { exists: false };

				updateOrAddAppStylesImport({
					typeScriptEstree,
					inputs: [globalStylesheetCssRelativeVitePath],
					output: globalStylesheetPostcssRelativeVitePath,
				});
				return { typeScriptEstree };
			},
		});

		await updateJavaScript({
			path: "/src/main.ts",
			async script({ exists, typeScriptEstree }) {
				if (!exists) return { exists: false };

				updateOrAddAppStylesImport({
					typeScriptEstree,
					inputs: [globalStylesheetCssRelativeVitePath],
					output: globalStylesheetPostcssRelativeVitePath,
				});
				return { typeScriptEstree };
			},
		});
	}

	await install({ package: "postcss" });
	await install({ package: "postcss-load-config" });
	await install({ package: "svelte-preprocess" });

	// TODO: move this to examples only
	await install({ package: "autoprefixer" });
	await install({ package: "cssnano" });
};
