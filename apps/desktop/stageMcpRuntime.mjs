// Copies what jiscribe-mcp reads at run time instead of importing, out of its
// built dist/, to where the bundled main process looks for it:
//   - dist/client/       -> out/main/client/  (resolveViewerAssets looks for
//     ./client/ beside the bundled module)
//   - dist/node_modules/ -> out/node_modules/ (the drawing guides and the
//     measuring fonts are found by node resolution from out/main/index.js)
// Which files those are, and why each is needed, is jiscribe-mcp's build.mjs.

import { existsSync } from "node:fs";
import { cp, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));

/** The jiscribe-mcp package directory, found through the dependency this app declares */
const findMcpPackageDir = () =>
	dirname(fileURLToPath(import.meta.resolve("jiscribe-mcp/package.json")));

/**
 * Stage jiscribe-mcp's runtime files into this app's out/.
 *
 * @param {string} [outDir] The electron-vite output directory (absolute);
 *   defaults to this app's out/
 * @returns {Promise<void>}
 * @throws Error When jiscribe-mcp has not been built, naming the command that
 *   builds it. Going on without them would leave a blank viewer, a
 *   read_drawing_guide that errors, and text measurement that silently falls
 *   back to estimates
 */
export async function stageMcpRuntime(outDir = join(appDir, "out")) {
	const mcpDistDir = join(findMcpPackageDir(), "dist");
	const sourceClientDir = join(mcpDistDir, "client");
	const sourceModulesDir = join(mcpDistDir, "node_modules");
	const missingDirs = [sourceClientDir, sourceModulesDir].filter(
		(sourceDir) => !existsSync(sourceDir),
	);
	if (missingDirs.length > 0) {
		throw new Error(
			`jiscribe-mcp is not built (missing ${missingDirs.join(", ")}). Run \`pnpm build:mcp\` from the repository root first.`,
		);
	}

	const targetClientDir = join(outDir, "main", "client");
	const targetModulesDir = join(outDir, "node_modules");
	await rm(targetClientDir, { recursive: true, force: true });
	await rm(targetModulesDir, { recursive: true, force: true });
	await cp(sourceClientDir, targetClientDir, { recursive: true });
	await cp(sourceModulesDir, targetModulesDir, { recursive: true });
	console.log(
		`Staged jiscribe-mcp runtime files: ${sourceClientDir} -> ${targetClientDir}, ${sourceModulesDir} -> ${targetModulesDir}`,
	);
}
