var importMetaGlob = require("./index")
module.exports = {
	input: "./test/src/main.js",
	output: {
		dir: "./test/dist",
		format: "esm",
		freeze: false,
		chunkFileNames: "[name].js",
		entryFileNames: "[name].js",
		assetFileNames: "[name][extname]",
	},
	plugins: [
		importMetaGlob()
	]
}