
var estreeWalker = require('estree-walker');
var MagicString = require('magic-string');
var pluginutils = require('@rollup/pluginutils');
var glob = require("fast-glob");
var path = require("path");

function createPlugin(options) {
	if (!options) options = {};
	var { include, exclude, sourceMap, sourcemap, ...rest } = options
	var filter = pluginutils.createFilter(include, exclude);

	sourceMap = sourceMap !== false && sourcemap !== false;
	var seq1 = 0;
	var seq2 = 0;
	return {
		name: "import-meta-glob",
		transform(code, id) {
			if (!filter(id)) { return null; }
			var ast = null;
			try {
				ast = this.parse(code);
			} catch (err) {
				this.warn({
					code: 'PARSE_ERROR',
					message: ("rollup-plugin-import-meta-glob: failed to parse " + id + ". Consider restricting the plugin to particular files via options.include")
				});
			}
			if (!ast) {
				return null;
			}
			var scope = pluginutils.attachScopes(ast, 'scope');
			var magicString = new MagicString(code);
			var changed = false;
			var imports = [];

			estreeWalker.walk(ast, {
				enter: function enter(node, parent) {
					if (sourceMap) {
						magicString.addSourcemapLocation(node.start);
						magicString.addSourcemapLocation(node.end);
					}
					if (node.scope) {
						scope = node.scope;
					}
					if (node.type === "CallExpression") {
						var callee = node.callee;
						if (callee) {
							if (callee.type === "MemberExpression") {
								var property = callee.property
								if (property) {
									if (property.type === "Identifier") {
										if (property.name === "glob") {
											let object = callee.object;
											if (object && object.type === "MetaProperty") {
												let arguments = node.arguments;
												if (arguments && arguments.length) {
													let argument1 = arguments[0];
													if (argument1.type === "Literal") {
														let paths = glob.sync(argument1.value, {
															cwd: base = path.dirname(id),
															...rest
														});
														magicString.overwrite(node.start, node.end, "{" + paths.map(function (path) {
															return JSON.stringify(path) + ": function(){ return import(" + JSON.stringify(path) + ");}"
														}).join(",") + "}");
														changed = true;
													} else {
														console.error("import.meta.glob() argument should be string")
													}
												} else {
													console.error("import.meta.glob() has no arguments")
												}
											}
										} else if (property.name === "globEager") {
											let object = callee.object;
											if (object && object.type === "MetaProperty") {
												let arguments = node.arguments;
												if (arguments && arguments.length) {
													let argument1 = arguments[0];
													if (argument1.type === "Literal") {
														let paths = glob.sync(argument1.value, {
															cwd: base = path.dirname(id),
															...rest
														});
														magicString.overwrite(node.start, node.end, "{" + paths.map(function (path) {
															let importName;
															do {
																importName = `__glob__${seq2}_${seq1++}`;
															} while (importName in scope.declarations);
															imports.push([importName, path]);
															return JSON.stringify(path) + ": " + importName
														}).join(",") + "}");
														changed = true;
													} else {
														console.error("import.meta.globEager() argument should be string")
													}
													seq2++;
												} else {
													console.error("import.meta.globEager() has no arguments")
												}
											}
										}
									}
								}
							}
						}
					}
				},
				leave: function leave(node) {
					if (node.scope) {
						scope = scope.parent;
					}
				}
			});
			if (imports.length) {
				magicString.prepend(imports.map(imp => `import * as ${imp[0]} from ${JSON.stringify(imp[1])};`).join(""));
				changed = true;
			}
			if (!changed) {
				return {
					code: code,
					ast: ast,
					map: sourceMap ? magicString.generateMap({ hires: true }) : null
				};
			}

			return {
				code: magicString.toString(),
				map: sourceMap ? magicString.generateMap({ hires: true }) : null
			};
		}
	};
}
createPlugin.default = createPlugin;
createPlugin.__esModule = true;
module.exports = createPlugin;