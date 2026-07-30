// Strict-mode test harness preload (used by `npm run test:strict`).
//
// Recompiles every module under lib/ with a prepended "use strict"
// directive before the suite runs. This reproduces exactly what an ESM
// bundler does when it inlines this CommonJS code into an ES module output:
// ES modules always run in strict mode, so the library must be fully
// strict-compatible even though it ships as CJS.
//
// The directive is prepended on the same line as the original first line,
// so line numbers in stack traces stay unchanged. Only lib/ is affected —
// test files and node_modules load normally.
var fs = require('fs');
var path = require('path');
var Module = require('module');

var sLibRoot = path.join(__dirname, '..', 'lib') + path.sep;
var fnCompileJs = Module._extensions['.js'];

Module._extensions['.js'] = function(oModule, sFileName) {
	if (sFileName.indexOf(sLibRoot) == 0) {
		var sSource = fs.readFileSync(sFileName, 'utf8');
		oModule._compile('"use strict";' + sSource, sFileName);
		return;
	}
	return fnCompileJs(oModule, sFileName);
};
