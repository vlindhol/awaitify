const esprima = require('esprima');
const escodegen = require('escodegen');
const walk = require('esprima-walk');
const _ = require('lodash');

/**
 * Given an object property chain (e.g. myObject.aProp.anotherProp) that
 * is parsed into an AST by esprima, check to see if this chain matches
 * the string array `path` (e.g. ['myObject', 'aProp', 'anotherProp']).
 * @param  {object} ast A leaf/node in an esprima AST.
 * @param  {array} path The wanted path, represented as an array of strings
 * @return {boolean}      Is it a match or not?
 */
function pathMatchesAst(ast, path) {
  if (ast.type === 'Identifier') {
    if (path.length === 1) return ast.name === path[0];
    return false;
  }
  if (ast.type === 'MemberExpression') {
    if (path.length > 1 && matches(ast.object, [path[0]])) {
      // We still have a chance of matching, go one step down in object property chain
      return matches(ast.property, path.slice(1));
    }
  }
  return false;
}

/**
 * Given a string of Javascript code in `code`, put the `await` keyword
 * in front of the function calls provided in the string array `funcPaths`.
 * Does actual parsing of the code, so if e.g. `module.f` is an async function, the code `module.f(x).g(y)` gets correctly converted into
 * `(await module.f(x)).g(y)`. The code is only analyzed statically.
 *
 * @param  {string} code  A string of well-formed javascript code.
 * @param  {array} funcPaths An array of strings containing the function calls that are known to be async. e.g. 'module.f'
 * @return {string}       The transformed string.
 */
function awaitify(code, funcPaths) {
  if (!_.isArray(funcPaths)) {
    throw new Error('Second argument must be array!');
  } else if(funcPaths.length === 0) return code;

  const splitFuncs = _.uniq(funcPaths).map(x => x.split('.'));

  let ast;
  try {
    ast = esprima.parse(code);
  } catch (err) {
    throw new Error('Could not parse code: ' + err.message);
  }

  const toBeReplaced = [];
  walk(ast, node => {
    if (node.type !== 'CallExpression') return;

    for (let i = 0; i < splitFuncs.length; i += 1) {
      if (pathMatchesAst(node.callee, splitFuncs[i])) {
        toBeReplaced.push(node);
      }
    }
  })

  // toBeReplaced contains the nodes that are to become 'AwaitExpression' nodes (containing the old node)
  for (let i = toBeReplaced.length - 1; i >= 0; i -= 1) {
    const oldNode = _.clone(toBeReplaced[i]);
    // Change the object in place to preserve references
    toBeReplaced[i].type = 'AwaitExpression';
    toBeReplaced[i].argument = oldNode;

    // Delete the obsolete keys
    _.forOwn(toBeReplaced[i], (val, key) => {
      if (key !== 'type' && key !== 'argument') {
        delete toBeReplaced[i][key];
      }
    })
  }
  return escodegen.generate(ast);
};

module.exports = awaitify;

