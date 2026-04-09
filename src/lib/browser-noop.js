/**
 * Empty stub for Node.js built-in modules that cannot be bundled for the browser.
 *
 * Used by turbopack.resolveAlias (next.config.js) to prevent build errors when
 * server-only packages (pg, firebase-admin) appear in the client bundle's module
 * graph. These modules are never executed in the browser — their code paths are
 * only reached on the server — so returning an empty object is safe.
 */
module.exports = {};
