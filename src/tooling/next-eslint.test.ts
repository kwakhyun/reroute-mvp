import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ESLint } from "eslint";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const require = createRequire(import.meta.url);
const requireFromConfig = createRequire(require.resolve("eslint-config-next"));
const { getRootDirs } = requireFromConfig("@next/eslint-plugin-next/dist/utils/get-root-dirs") as {
  getRootDirs: (context: { cwd: string; settings: { next?: { rootDir?: string | string[] } } }) => string[];
};
let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "reroute-eslint-"));
  await mkdir(path.join(directory, "apps/web/pages"), { recursive: true });
  await mkdir(path.join(directory, "apps/admin"), { recursive: true });
  await writeFile(path.join(directory, "apps/notes.txt"), "not an application directory");
  await writeFile(path.join(directory, "apps/web/pages/about.tsx"), "export default function About() { return null; }");
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

function roots(rootDir?: string | string[]) {
  return getRootDirs({ cwd: directory, settings: { next: { rootDir } } }).sort();
}

describe("Next.js ESLint directory discovery after the glob security replacement", () => {
  it("keeps the working directory when no custom root is configured", () => {
    expect(roots()).toEqual([directory]);
  });

  it("resolves a literal root and normalizes backslash separators", () => {
    const root = path.join(directory, "apps/web");
    expect(roots(root)).toEqual([root]);
    expect(roots(root.replaceAll("/", "\\"))).toEqual([root]);
  });

  it("expands wildcard roots while excluding regular files", () => {
    expect(roots(`${directory}/apps/*`)).toEqual([`${directory}/apps/admin`, `${directory}/apps/web`]);
  });

  it("preserves relative root paths", () => {
    const relative = path.relative(projectRoot, directory);
    expect(roots(`${relative}/apps/*`)).toEqual([`${relative}/apps/admin`, `${relative}/apps/web`]);
  });

  it("supports brace patterns and arrays of roots", () => {
    const expected = [`${directory}/apps/admin`, `${directory}/apps/web`];
    expect(roots(`${directory}/apps/{web,admin}`)).toEqual(expected);
    expect(roots([`${directory}/apps/web`, `${directory}/apps/admin`])).toEqual(expected);
  });

  it("returns no roots for an unmatched pattern", () => {
    expect(roots(`${directory}/missing/*`)).toEqual([]);
  });

  it("fails explicitly if a plugin update requests an unsupported glob API", () => {
    const requireFromPlugin = createRequire(requireFromConfig.resolve("@next/eslint-plugin-next"));
    const { globSync } = requireFromPlugin("fast-glob") as { globSync: (pattern: unknown, options?: object) => string[] };
    expect(() => globSync([directory], { onlyDirectories: true })).toThrow(TypeError);
    expect(() => globSync(directory, { onlyFiles: true })).toThrow(TypeError);
    expect(() => globSync(directory, { onlyDirectories: true, cwd: directory })).toThrow(TypeError);
  });

  it("still reports internal anchor navigation with the actual project ESLint config", async () => {
    const { default: config } = await import(pathToFileURL(path.join(projectRoot, "eslint.config.mjs")).href);
    const eslint = new ESLint({
      cwd: directory,
      overrideConfigFile: true,
      overrideConfig: [...config, { settings: { next: { rootDir: `${directory}/apps/{web,admin}` } } }],
    });
    const filePath = path.join(directory, "navigation.tsx");
    const [invalid] = await eslint.lintText('export default function Navigation() { return <a href="/about/">About</a>; }', { filePath });
    expect(invalid.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: "@next/next/no-html-link-for-pages", severity: 2 }),
    ]));

    const [valid] = await eslint.lintText('import Link from "next/link"; export default function Navigation() { return <Link href="/about/">About</Link>; }', { filePath });
    expect(valid.messages).toEqual([]);
  }, 30_000);
});
