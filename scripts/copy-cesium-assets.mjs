import { access, cp, mkdir } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "node_modules", "cesium", "Build", "Cesium");
const destinationRoot = path.join(projectRoot, "public", "cesium");
const directoriesToCopy = ["Workers", "ThirdParty", "Assets", "Widgets"];

async function ensureDirectoryExists(targetPath) {
  await mkdir(targetPath, { recursive: true });
}

async function copyDirectory(sourcePath, destinationPath) {
  await ensureDirectoryExists(destinationPath);
  await cp(sourcePath, destinationPath, { recursive: true, force: true });
}

async function main() {
  try {
    for (const directory of directoriesToCopy) {
      const sourceDirectory = path.join(sourceRoot, directory);
      await access(sourceDirectory);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Cesium runtime assets are missing. Expected them under ${sourceRoot}. Install the dependency first. Original error: ${message}`,
    );
  }

  await ensureDirectoryExists(destinationRoot);

  for (const directory of directoriesToCopy) {
    const sourceDirectory = path.join(sourceRoot, directory);
    const destinationDirectory = path.join(destinationRoot, directory);
    await copyDirectory(sourceDirectory, destinationDirectory);
  }

  console.log(`Copied Cesium asset directories: ${directoriesToCopy.join(", ")}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Cesium asset copy failed: ${message}`);
  process.exit(1);
});
