import { globSync as nativeGlobSync, statSync } from "node:fs";

// This replaces only getRootDirs' call in the pinned Next.js ESLint plugin.
// Reject other signatures so an upstream API change cannot silently skip linting.
export function globSync(pattern, options) {
  if (typeof pattern !== "string" || options?.onlyDirectories !== true || Object.keys(options).length !== 1) {
    throw new TypeError("The Next.js ESLint glob adapter only supports directory patterns");
  }
  return nativeGlobSync(pattern).filter((entry) => statSync(entry, { throwIfNoEntry: false })?.isDirectory());
}
