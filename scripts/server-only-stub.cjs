// Redirect "server-only" CJS resolution to empty.js (which does nothing) instead of
// index.js (which always throws). tsx loads TypeScript modules via CJS require(),
// bypassing ESM loader hooks.
const Module = require("node:module");
const origResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") {
    const indexPath = origResolveFilename.call(this, request, parent, isMain, options);
    return indexPath.replace(/index\.js$/, "empty.js");
  }
  return origResolveFilename.apply(this, arguments);
};
