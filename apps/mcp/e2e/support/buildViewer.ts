// Builds the viewer before the suite runs.
//
// The host reads dist/client/index.html at startup and refuses to start without it,
// so an unbuilt checkout would fail every test at open_canvas. Building here also
// means the page under test is the one that ships — the single HTML with the JS and
// CSS folded in — rather than vite's unfolded development output.

import { execFileSync } from "node:child_process";
import path from "node:path";

import type { FullConfig } from "@playwright/test";

/** What a person runs by hand when this fails, named in the error */
const BUILD_COMMAND = "pnpm --filter jiscribe-mcp build";

/**
 * Resolves the workspace root pnpm has to run from: the outer repository when this
 * one is mounted there as a submodule, this repository's root otherwise. Started
 * with its cwd inside the submodule, pnpm would install the engine workspace instead
 * of the outer one — rewriting engine's lockfile and pointing every node_modules at
 * a store that was never populated.
 *
 * @param engineRoot This repository's root, the fallback when git is absent or
 *   reports no superproject
 */
function resolveWorkspaceRoot(engineRoot: string): string {
	try {
		const superprojectRoot = execFileSync(
			"git",
			["rev-parse", "--show-superproject-working-tree"],
			{
				cwd: engineRoot,
				encoding: "utf8",
				stdio: ["ignore", "pipe", "ignore"],
			},
		).trim();
		return superprojectRoot === "" ? engineRoot : superprojectRoot;
	} catch {
		return engineRoot;
	}
}

/**
 * Runs the package's own build, from the root of the workspace that installed it.
 *
 * @param config Playwright's resolved configuration, read only for `configFile`:
 *   it is the one path here that names the package directory, whatever directory
 *   the run was started from
 * @throws Error naming {@link BUILD_COMMAND} when the build fails, so a blank page
 *   is never what a missing build looks like
 */
export default function buildViewer(config: FullConfig): void {
	const packageRoot =
		config.configFile === undefined
			? process.cwd()
			: path.dirname(config.configFile);
	const engineRoot = path.join(packageRoot, "..", "..");
	try {
		execFileSync("pnpm", ["--filter", "jiscribe-mcp", "build"], {
			cwd: resolveWorkspaceRoot(engineRoot),
			stdio: "inherit",
		});
	} catch (error) {
		throw new Error(
			`the canvas viewer could not be built, so there is nothing for the host to serve. Run \`${BUILD_COMMAND}\` and read what it says: ${String(error)}`,
		);
	}
}
