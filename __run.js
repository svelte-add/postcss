import { walk } from "estree-walker";
import { Comment } from "postcss";
import { newTypeScriptEstreeAst } from "../../ast-io.js";
import { getConfigObject } from "../../ast-tools.js";
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
	/** @type {string | undefined} */
	let sveltePreprocessImportedAs;

	// Try to find what svelte-preprocess is imported as
	// (it is different between SvelteKit (`preprocess`) and Vite (`sveltePreprocess`))
	// https://github.com/svelte-add/postcss/issues/21
	walk(svelteConfigAst, {
		enter(node) {
			if (cjs) {
				if (node.type !== "VariableDeclarator") return;

				/** @type {import("estree").VariableDeclarator} */
				const declarator = (node);
				
				if (declarator.id.type !== "Identifier") return;
				const identifier = declarator.id;
				
				if (!declarator.init) return;
				if (declarator.init.type !== "CallExpression") return;
				const callExpression = declarator.init;

				if (callExpression.callee.type !== "Identifier") return;
				/** @type {import("estree").Identifier} */
				const callee = (callExpression.callee);

				if (callee.name !== "require") return;

				if (callExpression.arguments[0].type !== "Literal") return;
				if (callExpression.arguments[0].value !== "svelte-preprocess") return;

				sveltePreprocessImportedAs = identifier.name;
			} else {
				if (node.type !== "ImportDeclaration") return;

				/** @type {import("estree").ImportDeclaration} */
				const importDeclaration = (node);
				
				if (importDeclaration.source.value !== "svelte-preprocess") return;
				
				for (const specifier of importDeclaration.specifiers) {
					if (specifier.type === "ImportDefaultSpecifier") sveltePreprocessImportedAs = specifier.local.name;
				}
			}
		},
	});

	// Add a svelte-preprocess import if it's not there
	if (!sveltePreprocessImportedAs) {
		sveltePreprocessImportedAs = "preprocess";
		if (cjs) {
			/** @type {import("estree").VariableDeclaration} */
			const requireSveltePreprocessAst = {
				type: "VariableDeclaration",
				declarations: [
					{
						type: "VariableDeclarator",
						id: {
							type: "Identifier",
							name: sveltePreprocessImportedAs,
						},
						init: {
							type: "CallExpression",
							// @ts-ignore - I am not sure why this is typed wrongly (?)
							arguments: [
								{
									type: "Literal",
									value: "svelte-preprocess",
								},
							],
							callee: {
								type: "Identifier",
								name: "require",
							},
							optional: false,
						},
					}
				],
				kind: "const",
			};

			svelteConfigAst.program.body.unshift(requireSveltePreprocessAst);
		} else {
			/** @type {import("estree").ImportDeclaration} */
			const importSveltePreprocessAst = {
				type: "ImportDeclaration",
				source: {
					type: "Literal",
					value: "svelte-preprocess",
				},
				specifiers: [
					{
						type: "ImportDefaultSpecifier",
						local: {
							type: "Identifier",
							name: sveltePreprocessImportedAs
						}
					}
				]
			};

			svelteConfigAst.program.body.unshift(importSveltePreprocessAst);
		}
	}
	
	// Try to find the exported config object
	/** @type {import("estree").ObjectExpression | undefined} */
	const configObject = getConfigObject({ cjs, typeScriptEstree: svelteConfigAst });
	
	// Try to find preprocess config
	/** @type {import("estree").Property | undefined} */
	let preprocessConfig;
	for (const property of configObject.properties) {
		if (property.type !== "Property") continue;
		if (property.key.type !== "Identifier") continue;
		if (property.key.name !== "preprocess") continue;
		
		preprocessConfig = property;
	}
	// Or set it to svelte-preprocess() if it doesn't exist
	if (!preprocessConfig) {
		preprocessConfig = {
			type: "Property",
			computed: false,
			key: {
				type: "Identifier",
				name: "preprocess",
			},
			kind: "init",
			method: false,
			shorthand: false,
			value: {
				type: "CallExpression",
				// @ts-ignore - I am not sure why this is typed wrongly (?)
				arguments: [],
				callee: {
					type: "Identifier",
					name: sveltePreprocessImportedAs,
				},
				optional: false,
			}
		};
		configObject.properties.push(preprocessConfig);
	}
	// Convert preprocess config from a single svelte-preprocess() function call to an array [svelte-preprocess()]
	if (preprocessConfig.value.type !== "ArrayExpression") {
		/** @type {import("estree").ArrayExpression} */
		const array = {
			type: "ArrayExpression",
			elements: [],
		};
		/** @type {import("estree").CallExpression} */
		const preprocessConfigValue = (preprocessConfig.value);
		array.elements.push(preprocessConfigValue);
		preprocessConfig.value = array;
	}
	
	// Add postcss: true to svelte-preprocess options
	for (const element of preprocessConfig.value.elements) {
		if (!element) continue;
		if (element.type !== "CallExpression") continue;
		if (element.callee.type !== "Identifier") continue;
		if (element.callee.name !== sveltePreprocessImportedAs) continue;

		// Initialize the options as {} if none were passed
		if (element.arguments.length === 0) {
			/** @type {import("estree").ObjectExpression} */
			const emptyObject = {
				type: "ObjectExpression",
				properties: [],
			}

			element.arguments.push(emptyObject);
		}

		/** @type {import("estree").ObjectExpression} */
		const sveltePreprocessArgs = (element.arguments[0]);

		/** @type {import("estree").ObjectExpression} */
		const objPostcssTrue = {
			type: "ObjectExpression",
			properties: [{
				computed: false,
				key: {
					type: "Literal",
					value: "postcss",
				},
				kind: "init",
				type: "Property",
				method: false,
				shorthand: false,
				value: {
					type: "Literal",
					value: true,
				},
			}]
		}

		sveltePreprocessArgs.properties.push(...objPostcssTrue.properties)
	}

	return svelteConfigAst;
}


/** @type {import("../..").AdderRun<{}>} */
export const run = async ({ environment, install, updateCss, updateJavaScript, updateSvelte }) => {
	await updateJavaScript({
		path: postcssConfigCjsPath,
		async script({ typeScriptEstree }) {
			const postcssConfigAst = newTypeScriptEstreeAst(postcssConfig);

			typeScriptEstree.program.body = postcssConfigAst.program.body;

			return {
				typeScriptEstree,
			}
		}
	});
	
	await updateJavaScript({
		path: "/svelte.config.js",
		async script({ exists, typeScriptEstree }) {
			if (!exists) return { exists: false };

			return {
				typeScriptEstree: updateSvelteConfig(typeScriptEstree, false),
			}
		}
	});
	
	await updateJavaScript({
		path: "/svelte.config.cjs",
		async script({ exists, typeScriptEstree }) {
			if (!exists) {
				if (environment.kit || environment.bundler !== "vite") return { exists: false };
			}
			
			return {
				typeScriptEstree: updateSvelteConfig(typeScriptEstree, true),
			}
		}
	});

	await updateCss({
		path: globalStylesheetCssPath,
		async style({ postcss: appCss }) {
			await updateCss({
				path: globalStylesheetPostcssPath,
				async style({ postcss: appPostcss }) {
					appPostcss.prepend(appCss);

					appPostcss.prepend(new Comment({
						text: stylesHint,
					}));

					return {
						postcss: appPostcss,
					};
				}
			});

			return {
				exists: false,
			};
		}
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
				const importDeclaration = (node);

				if (typeof importDeclaration.source.value !== "string") return;
				
				if (!inputs.includes(importDeclaration.source.value)) return;

				appStylesImport = importDeclaration;
			}
		});

		if (!appStylesImport) {
			appStylesImport = {
				type: "ImportDeclaration",
				source: {
					type: "Literal",
					value: output,
				},
				specifiers: [],
			}
			typeScriptEstree.program.body.unshift(appStylesImport);
		}

		appStylesImport.source.value = output;
	};

	if (environment.kit) await updateSvelte({
		path: "/src/routes/__layout.svelte",

		async markup({ posthtml }) {
			const slot = posthtml.some(node => typeof node !== "string" && typeof node !== "number" && node.tag === "slot");

			if (!slot) posthtml.push("\n", { tag: "slot" });

			return {
				posthtml,
			};
		},

		async script({ lang, typeScriptEstree }) {
			updateOrAddAppStylesImport({ typeScriptEstree, inputs: [globalStylesheetCssRelativePath], output: globalStylesheetPostcssRelativePath });

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

				updateOrAddAppStylesImport({ typeScriptEstree, inputs: [globalStylesheetCssRelativeVitePath], output: globalStylesheetPostcssRelativeVitePath });
				return { typeScriptEstree };
			}
		});

		await updateJavaScript({
			path: "/src/main.ts",
			async script({ exists, typeScriptEstree }) {
				if (!exists) return { exists: false };

				updateOrAddAppStylesImport({ typeScriptEstree, inputs: [globalStylesheetCssRelativeVitePath], output: globalStylesheetPostcssRelativeVitePath });
				return { typeScriptEstree };
			}
		});
	}

	await install({ package: "postcss" });
	await install({ package: "postcss-load-config" });
	await install({ package: "svelte-preprocess" });
	
	// TODO: move this to examples only
	await install({ package: "autoprefixer" });
	await install({ package: "cssnano" });
};
