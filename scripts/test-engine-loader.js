const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

function loadMageEngine() {
  const filename = path.resolve(__dirname, '..', 'src', 'engine', 'mageFirstProof.js');
  const source = fs.readFileSync(filename, 'utf8');
  const transformed = babel.transformSync(source, {
    filename,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const module = { exports: {} };
  Function('module', 'exports', 'require', '__filename', '__dirname', transformed)(module, module.exports, require, filename, path.dirname(filename));
  return module.exports;
}

module.exports = { loadMageEngine };
