export const name = "PostCSS";

/** @typedef {{ autoprefixer: boolean }} Options */

/** @type {import("../..").AdderOptions<Options>} */
export const options = {
	autoprefixer: {
		context: "https://github.com/postcss/autoprefixer",
		default: true,
		question: "Do you want to use Autoprefixer?",
	},
};
