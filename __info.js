import { extension } from "./stuff.js";

export const name = "PostCSS";

export const emoji = "🔺";

export const usageMarkdown = ['You can write PostCSS syntax in the `style lang="postcss"` blocks in Svelte files.', "You can write PostCSS syntax in the `src/app.css` file.\n\n  This is your global stylesheet because it will be active on every page of your site.", "You can install more [PostCSS plugins](https://github.com/postcss/postcss/blob/main/docs/plugins.md) and configure them in the `postcss.config.cjs` file."];

/** @type {import("../..").Gatekeep} */
export const gatekeep = async () => {
	return { able: true };
};

/** @typedef {{ autoprefixer: boolean }} Options */

/** @type {import("../..").AdderOptions<Options>} */
export const options = {
	autoprefixer: {
		context: "https://github.com/postcss/autoprefixer",
		default: true,
		descriptionMarkdown: "whether or not to install and set up [Autoprefixer](https://github.com/postcss/autoprefixer).",
		question: "Do you want to use Autoprefixer?",
	},
};

/** @type {import("../..").Heuristic[]} */
export const heuristics = [
	{
		description: "`postcss` is installed",
		async detector({ folderInfo }) {
			return "postcss" in folderInfo.allDependencies;
		},
	},
	{
		description: "`postcss-load-config` is installed",
		async detector({ folderInfo }) {
			return "postcss-load-config" in folderInfo.allDependencies;
		},
	},
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
		description: "The main file (`src/routes/+layout.svelte` for SvelteKit, `src/main.js` or `src/main.ts` for Vite) imports `src/app.css`",
		async detector({ folderInfo, readFile }) {
			if (folderInfo.kit) {
				const { text } = await readFile({ path: "/src/routes/+layout.svelte" });

				return text.includes(`../app.${extension}`);
			}

			const ts = await readFile({ path: "/src/main.ts" });
			if (ts.exists) return ts.text.includes(`./app.${extension}`);

			const js = await readFile({ path: "/src/main.js" });
			return js.text.includes(`./app.${extension}`);
		},
	},
];
