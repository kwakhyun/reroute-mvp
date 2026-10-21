import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

const resetPathError = () => new Error("db:reset only accepts a regular local database under ./data without symbolic links");

export async function resolveResetDatabasePath(databaseUrl: string, projectRoot = process.cwd()) {
  if (!databaseUrl.startsWith("file:") || /[?#\0]/.test(databaseUrl)) throw resetPathError();
  const encodedPath = databaseUrl.slice("file:".length);
  // Encoded separators and dots can change the target when URL decoding and
  // path normalization happen in a different order in the database driver.
  if (!encodedPath || encodedPath.startsWith("//") || /%(?:2f|5c|2e)/i.test(encodedPath)) throw resetPathError();

  let filePath: string;
  try {
    filePath = decodeURIComponent(encodedPath);
  } catch {
    throw resetPathError();
  }
  if (filePath.includes("\0")) throw resetPathError();

  const root = await realpath(projectRoot);
  const dataRoot = path.join(root, "data");
  const databasePath = path.resolve(root, filePath);
  const relative = path.relative(dataRoot, databasePath);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw resetPathError();
  }

  // Check each existing component, including ./data and the database itself.
  // A missing component is safe to create, but an existing symlink is never followed.
  const components = ["data", ...relative.split(path.sep)];
  let currentPath = root;
  for (let index = 0; index < components.length; index++) {
    currentPath = path.join(currentPath, components[index]);
    let entry;
    try {
      entry = await lstat(currentPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") break;
      throw error;
    }
    const finalComponent = index === components.length - 1;
    if (entry.isSymbolicLink() || (finalComponent ? !entry.isFile() : !entry.isDirectory())) {
      throw resetPathError();
    }
  }
  return databasePath;
}
