## Glob Import

Vite supports importing multiple modules from the file system via the special `import.meta.glob` function:

```js
const modules = import.meta.glob('./dir/*.js')
```

The above will be transformed into the following:

```js
// code produced by vite
const modules = {
  './dir/foo.js': () => import('./dir/foo.js'),
  './dir/bar.js': () => import('./dir/bar.js')
}
```

You can then iterate over the keys of the `modules` object to access the corresponding modules:

```js
for (const path in modules) {
  modules[path]().then((mod) => {
    console.log(path, mod)
  })
}
```

Matched files are by default lazy loaded via dynamic import and will be split into separate chunks during build. If you'd rather import all the modules directly (e.g. relying on side-effects in these modules to be applied first), you can use `import.meta.globEager` instead:

```js
const modules = import.meta.globEager('./dir/*.js')
```

The above will be transformed into the following:

```js
// code produced by vite
import * as __glob__0_0 from './dir/foo.js'
import * as __glob__0_1 from './dir/bar.js'
const modules = {
  './dir/foo.js': __glob__0_0,
  './dir/bar.js': __glob__0_1
}
```

Note that:

- This is a Vite-only feature and is not a web or ES standard.
- The glob patterns are treated like import specifiers: they must be relative (start with `./`).
- The glob matching is done via `fast-glob` - check out its documentation for [supported glob patterns](https://github.com/mrmlnc/fast-glob#pattern-syntax).
- You should also be aware that glob imports do not accept variables, you need to directly pass the string pattern.