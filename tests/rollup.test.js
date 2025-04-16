const fs = require("fs-extra");
const path = require("path");
const { expect } = require('chai');
const { rollup } = require('rollup');

function test(title, options) {
	it(title, async function () {
		var bundle = await rollup({
			input: [
				path.resolve(__dirname, "src/glob.js"),
			],
			plugins: [
				require("../index")(options),
			],
		});
		let destPath = path.resolve(__dirname, "dest");
		let srcPath = path.resolve(__dirname, 'src');
		if (await fs.exists(destPath)) {
			await Promise.all(
				bundle.cache.modules.map(async (module) => {
					if (module.id.startsWith(srcPath)) {
						let destFullPath = destPath + module.id.substring(srcPath.length);
						let content = await fs.readFile(destFullPath, "utf8");
						expect(content).to.equal(module.code);
					}
				})
			);
		} else {
			await fs.mkdir(destPath);
			await Promise.all(
				bundle.cache.modules.map(async (module) => {
					if (module.id.startsWith(srcPath)) {
						let target = path.resolve(destPath, module.id.substring(srcPath.length + 1));
						let dir = path.dirname(target);
						await fs.mkdir(dir, { recursive: true });
						await fs.writeFile(target, module.code);
					}
				})
			);
		}
	});
}

describe('rollup-plugin-import-meta-glob', function () {
	test('glob', {});
});
