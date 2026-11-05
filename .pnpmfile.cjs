/* global module */
// TypeScript 7 provides the CLI; these tools consume the TypeScript 6 JS API.
module.exports = {
  hooks: {
    /** @param {{ peerDependencies?: Record<string, string>, dependencies?: Record<string, string> }} pkg */
    readPackage(pkg) {
      if (pkg.peerDependencies?.typescript) {
        pkg.dependencies = { ...pkg.dependencies, typescript: '^6.0.2' };
        delete pkg.peerDependencies.typescript;
      }
      return pkg;
    },
  },
};
