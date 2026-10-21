# Next.js ESLint directory glob adapter

`eslint-config-next@16.3.8` brings in `@next/eslint-plugin-next`, whose only
`fast-glob` call is `globSync(pattern, { onlyDirectories: true })` in
`dist/utils/get-root-dirs.js`.

The upstream chain `fast-glob → micromatch → braces` includes
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
There is no patched `braces` release as of 2026-10-22. This local package removes
that dependency chain and implements the required directory lookup using the
stable Node.js `fs.globSync` API. It has no third-party dependencies.

The root package declares this adapter as a local `fast-glob` development
dependency and uses npm's `$fast-glob` override so the plugin resolves the same
package. The Next.js framework and ESLint config remain pinned to 16.3.8.
No ESLint rules or audit checks are disabled.

This is intentionally not a general replacement for the full `fast-glob` API.
Unsupported arguments throw instead of silently weakening directory discovery.
Before changing the Next.js ESLint version, check its `fast-glob` usage and run
`src/tooling/next-eslint.test.ts`, including its real ESLint violation check.
Remove this adapter and the override when the upstream plugin no longer needs
the vulnerable dependency chain.

Node.js 22.21 or 24 is required by the project. Docker copies this directory
before `npm ci` so the local package is available during installation.
