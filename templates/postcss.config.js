const cssnano = require("cssnano");

const mode = process.env.NODE_ENV;
const dev = mode === "development";

const plugins = {
	tailwindcss: {},
	autoprefixer: {},
};

if (!dev) {
	plugins['cssnano'] = { preset: "default" };
}
// plugins: [
// 	!dev && cssnano({
// 		preset: "default",
// 	}),

module.exports = { plugins };
