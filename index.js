
var estreeWalker = require('estree-walker');
var MagicString = require('magic-string');
var pluginutils = require('@rollup/pluginutils');
var { glob } = require("tinyglobby");
var path = require("path");
var qs = require("sky-qs");

function createPlugin(options) {
	if (!options) options = {};
	var { arrowFunction, include, exclude, sourceMap, sourcemap, ...rest } = options
	var filter = pluginutils.createFilter(include, exclude);

	sourceMap = sourceMap !== false && sourcemap !== false;
	return {
		name: "import-meta-glob",
		async transform(code, id) {
			if (!filter(id)) { return null; }
			let ast = null;
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
			let imports = new Set();
			ast.body.forEach(function (node) {
				if (node.type === 'ImportDeclaration') {
					node.specifiers.forEach(function (specifier) {
						imports.add(specifier.local.name);
					});
				}
			});

			let seq1 = 0;
			let seq2 = 0;
			let scope = pluginutils.attachScopes(ast, 'scope');
			let magicString = new MagicString(code);
			let modified = false;
			let globNodes = new Map();

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
						let callee = node.callee;
						if (callee) {
							if (callee.type === "MemberExpression") {
								let property = callee.property
								if (property) {
									if (property.type === "Identifier") {
										if (property.name === "glob") {
											let object = callee.object;
											if (object && object.type === "MetaProperty") {
												let args = node.arguments;
												if (args && args.length) {
													globNodes.set(node, [
														astToObject(args[0]),
														args.length > 1 ?
															astToObject(args[1]) :
															{}
													])
												} else {
													console.error("import.meta.glob() has no arguments")
												}
											}
										} else if (property.name === "globEager") {
											let object = callee.object;
											if (object && object.type === "MetaProperty") {
												let args = node.arguments;
												if (args && args.length) {
													globNodes.set(node, [
														astToObject(args[0]),
														{ eager: true }
													])
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
			for (let [node, args] of globNodes) {
				let [patterns, options] = args;
				if (options.eager) {
					let paths = await glob(patterns, {
						cwd: path.dirname(id),
						...rest
					});
					magicString.overwrite(
						node.start,
						node.end,
						"{" + paths
							.map(genId, options)
							.map(id => {
								let localName = options.import;
								let importName;
								do {
									importName = `__glob__${seq2}_${seq1++}`;
								} while (imports.has(importName) || scope.contains(importName));
								if (localName) {
									magicString.appendLeft(0, `import { ${localName} as ${importName} } from ${JSON.stringify(id)};\n`)
								} else {
									magicString.appendLeft(0, `import * as ${importName} from ${JSON.stringify(id)};\n`)
								}
								return JSON.stringify(id) + ": " + importName
							})
							.join(",") +
						"}"
					);
					seq2++;
				} else {
					let paths = await glob(patterns, {
						cwd: path.dirname(id),
						...rest
					});
					magicString.overwrite(
						node.start,
						node.end,
						"{" + paths
							.map(genId, options)
							.map(id => {
								let localName = options.import;
								if (arrowFunction) {
									if (localName) {
										return JSON.stringify(id) + ": ()=>import(" + JSON.stringify(id) + ").then(m=>m." + localName + ")";
									}
									return JSON.stringify(id) + ": ()=>import(" + JSON.stringify(id) + ")";
								} else {
									if (localName) {
										return JSON.stringify(id) + ":function(){return import(" + JSON.stringify(id) + ").then(function(m){return m." + localName + "})}"
									}
									return JSON.stringify(id) + ":function(){return import(" + JSON.stringify(id) + ")}"
								}
							})
							.join(",") +
						"}"
					);
				}
				modified = true;
			}
			if (modified) {
				return {
					code: magicString.toString(),
					map: sourceMap ? magicString.generateMap({ hires: true }) : null
				};
			}
			return {
				code: code,
				ast: ast
			};
		}
	};
}
function genId(id) {
	if (!id.startsWith(".")) {
		id = "./" + id
	}
	let query = this.query
	if (query) {
		if (typeof query === "string") {
			id = id + query
		} else if (typeof query === "object") {
			id = id + "?" + qs.stringify(query)
		} else {
			throw new TypeError("import.meta.glob() query should be string or object")
		}
	}
	return id;
}
function astToObject(node) {
	switch (node.type) {
		case "ObjectExpression":
			return node.properties.reduce((acc, prop) => {
				if (prop.type === "Property") {
					if (!prop.computed) {
						if (prop.key.type === "Identifier") {
							acc[prop.key.name] = astToObject(prop.value);
							return acc;
						}
					}
				}
				throw new TypeError("import.meta.glob() argument object property should be static")
			}, {});
		case "ArrayExpression":
			return node.elements.map(astToObject);
		case "StringLiteral":
		case "NumberLiteral":
		case "BooleanLiteral":
		case "Literal":
			return node.value;
	}
	throw new TypeError("import.meta.glob() argument should be static")
}
createPlugin.default = createPlugin;
module.exports = createPlugin;
