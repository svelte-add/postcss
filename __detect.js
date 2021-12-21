import { extension } from "./stuff.js";

/** @type {import("../..").Heuristic[]} */
export const heuristics = [
	{
		description: "`svelte-preprocess` reads PostCSS config implicitly in `svelte.config.js`",
		async detector({ readFile }) {
			const js = await readFile({ path: "/svelte.config.js" });
			const cjs = await readFile({ path: "/svelte.config.cjs" });

			/** @param {string} text */
			const preprocessIsProbablySetup = (text) => {
				if (!text.includes("svelte-preprocess")) return false;

				return true;
			};

			if (js.exists) return preprocessIsProbablySetup(js.text);
			else if (cjs.exists) return preprocessIsProbablySetup(cjs.text);

			return false;
		},
	},
	{
		description: "`postcss.config.cjs` exists and `postcss.config.js` does not exist",
		async detector({ readFile }) {
			const cjs = await readFile({ path: "/postcss.config.cjs" });
			const js = await readFile({ path: "/postcss.config.js" });

			return cjs.exists && !js.exists;
		},
	},
	{
		description: `\`src/app.${extension}\` exists`,
		async detector({ readFile }) {
			const postcss = await readFile({ path: `/src/app.${extension}` });

			return postcss.exists;
		},
	},
	{
		description: "The main file (`src/routes/__layout.svelte` for SvelteKit, `src/main.js` or `src/main.ts` for Vite) imports `src/app.postcss`",
		async detector({ folderInfo, readFile }) {
			if (folderInfo.kit) {
				const { text } = await readFile({ path: "/src/routes/__layout.svelte" });

				return text.includes(`../app.${extension}`);
			}

			const ts = await readFile({ path: "/src/main.ts" });
			if (ts.exists) return ts.text.includes(`./app.${extension}`);

			const js = await readFile({ path: "/src/main.js" });
			return js.text.includes(`./app.${extension}`);
		},
	},
];
