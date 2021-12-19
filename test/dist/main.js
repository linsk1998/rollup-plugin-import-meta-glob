var c = "c";

var __glob__0_1 = {
	__proto__: null,
	'default': c
};

var d = "d";

var __glob__0_2 = {
	__proto__: null,
	'default': d
};

var __glob__0_0=1;
console.log({"./deps/a.js": function(){ return import('./a.js');},"./deps/b.js": function(){ return import('./b.js');}});
console.log(__glob__0_0);
console.log({"./deps/eager/c.js": __glob__0_1,"./deps/eager/d.js": __glob__0_2});
