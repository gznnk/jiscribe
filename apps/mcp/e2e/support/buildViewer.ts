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
 * Runs the package's own build, from the repository root.
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
	const repositoryRoot = path.join(packageRoot, "..", "..");
	try {
		execFileSync("pnpm", ["--filter", "jiscribe-mcp", "build"], {
			cwd: repositoryRoot,
			stdio: "inherit",
		});
	} catch (error) {
		throw new Error(
			`the canvas viewer could not be built, so there is nothing for the host to serve. Run \`${BUILD_COMMAND}\` and read what it says: ${String(error)}`,
		);
	}
}
