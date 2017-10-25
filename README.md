# awaitify

Ever needed to add the `await` keyword to a lot of functions in a big bunch of code? Search and replace doesn't cut it, since a function call may be chained to other calls, and

```node
  await lib.f(x).g(y)
  // is not the same as
  (await lib.f(x)).g(y)
```

awaitify statically analyses your code and inserts `await` in a correct manner, for the specified function calls. Note that it does not preserve indentation or syntax, it uses the default settings from `escodegen`.

This package is mainly intended for use by the `gulp-awaitify` package.

## Usage

```node
const awaitify = require('awaitify');

const code = `
  async function foo() {
    const a = libExample.bar(5);
    const b = libExample.baz(y).process();
    const untouched = libExample.qwerty();
    const c = f(x);
  }
`;

// Give function calls as an array of strings
const functionCalls = ['f', 'libExample.bar', 'libExample.baz'];

const results = awaitify(code, functionCalls);

const expected = `
  async function foo() {
    const a = await libExample.bar(5);
    const b = (await libExample.baz(y)).process();
    const untouched = libExample.qwerty();
    const c = await f(x);
  }
`

console.log(results === expected) // true
```

Note that awaitify only analyzes the code statically, i.e. more advanced expressions than property chains are not possible to give as the second argument. In the example above, there is no way to get at the `process` function, for example.