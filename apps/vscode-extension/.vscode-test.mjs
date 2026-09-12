// Runner config for the e2e tests (@vscode/test-cli).
// Launches a real VSCode with this folder as the extension under development and runs
// the bundles build-e2e.mjs put in out/e2e/.
// Run: pnpm --filter jiscribe test:e2e

import { existsSync } from "node:fs";

import { defineConfig } from "@vscode/test-cli";

// VSCode 1.85.0 can only put its IPC socket under $XDG_RUNTIME_DIR and, when that
// directory is missing, dies with EACCES after minutes of silence that look like a
// hang (newer VSCode falls back to the temp directory). Fail here with the fix
// instead; creating the directory on the caller's behalf would hide the mismatch.
const runtimeDirectory = process.env.XDG_RUNTIME_DIR;
if (runtimeDirectory !== undefined && !existsSync(runtimeDirectory)) {
	throw new Error(
		`XDG_RUNTIME_DIR points at ${runtimeDirectory}, which does not exist; ` +
			"VSCode 1.85.0 cannot start without it. Point it at an existing " +
			"directory only you can read (e.g. XDG_RUNTIME_DIR=$(mktemp -d)).",
	);
}

// Both ends of the supported range: the engines.vscode minimum in package.json, and
// whatever ships today. Something that passes only on stable is already broken for
// everyone still on 1.85.
const VSCODE_VERSIONS = ["1.85.0", "stable"];

export default defineConfig(
	VSCODE_VERSIONS.map((version) => ({
		label: `vscode-${version}`,
		version,
		files: "out/e2e/**/*.test.js",
		launchArgs: [
			// Any other installed extension may claim the same file names, and the
			// tests assert which editor a canvas file lands in.
			"--disable-extensions",
			// The fixtures live in a temp directory, which would otherwise open
			// behind the workspace trust prompt.
			"--disable-workspace-trust",
		],
		mocha: {
			ui: "bdd",
			// A custom editor resolves its webview before the first assertion, and
			// the canvas bundle is ~1MB of JS to evaluate.
			timeout: 20_000,
		},
	})),
);
