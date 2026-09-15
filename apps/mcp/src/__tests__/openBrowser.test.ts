import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type * as headlessProfileModule from "../host/headlessProfile";
import { openBrowser } from "../host/openBrowser";

/** Why a machine that is not WSL has no Windows-side profile directory */
const NO_WINDOWS_REASON = "there is no cmd.exe here";

// Windows is never actually asked where to put a profile: the answer would differ
// between a WSL box and a plain Linux one, and what is on trial is what happens
// with it rather than the asking (that is headlessProfile's own test)
vi.mock("../host/headlessProfile", async (importOriginal) => {
	const actual = await importOriginal<typeof headlessProfileModule>();
	return {
		...actual,
		createHeadlessProfile: (platform: NodeJS.Platform) =>
			actual.createHeadlessProfile(platform, () => ({
				ok: false,
				reason: NO_WINDOWS_REASON,
			})),
	};
});

let workDir: string | null = null;

afterEach(() => {
	if (workDir !== null) {
		rmSync(workDir, { recursive: true, force: true });
		workDir = null;
	}
});

const waitFor = async (isDone: () => boolean): Promise<void> => {
	for (let attempt = 0; attempt < 400; attempt += 1) {
		if (isDone()) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	throw new Error("timed out waiting for the browser stand-in");
};

/**
 * A browser that does the two things this test is about: it makes the profile
 * directory it was given and says where that was, then leaves.
 *
 * @param reportPath Where it writes the directory it was told to use
 */
const writeFakeBrowser = (reportPath: string): string => {
	const scriptPath = join(workDir ?? "", "fake-browser.sh");
	writeFileSync(
		scriptPath,
		[
			"#!/bin/sh",
			'for arg in "$@"; do',
			'  case "$arg" in',
			"  --user-data-dir=*)",
			'    dir="${arg#--user-data-dir=}"',
			'    mkdir -p "$dir"',
			`    printf '%s' "$dir" > ${JSON.stringify(reportPath)}`,
			"    ;;",
			"  esac",
			"done",
		].join("\n"),
		{ encoding: "utf8", mode: 0o755 },
	);
	return scriptPath;
};

/**
 * No real browser is put up: a candidate that does not exist fails with ENOENT,
 * and where one has to start, a shell script stands in for it. What is on trial
 * is what the caller is told and what is left on disk, not the browser
 */
describe("openBrowser", () => {
	it("reports a headless executable that could not be started, with the way to name another", async () => {
		const reason = await new Promise<string>((resolve) => {
			openBrowser("http://localhost:1/", {
				mode: "headless",
				browserCommand: "/nonexistent/jiscribe-probe/chrome",
				onFailure: resolve,
			});
		});

		expect(reason).toContain("/nonexistent/jiscribe-probe/chrome");
		expect(reason).toContain("ENOENT");
		expect(reason).toContain("JISCRIBE_MCP_BROWSER");
	});

	it("says why the Windows-side browsers were left out, rather than running one anyway", async () => {
		// Quietly putting it on the user's own profile, or on a directory the whole
		// machine can write to, is what naming a profile is here to prevent
		const reason = await new Promise<string>((resolve) => {
			openBrowser("http://localhost:1/", {
				mode: "headless",
				browserCommand:
					"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
				onFailure: resolve,
			});
		});

		expect(reason).toContain(NO_WINDOWS_REASON);
		expect(reason).toContain("left out");
	});

	// A shell script stands in for the browser, so only where one can be run
	it.skipIf(process.platform === "win32")(
		"runs a headless browser on a profile of its own and takes it away again",
		async () => {
			// Left on the user's own profile, the launch contends with the browser
			// they already have open; left behind afterwards, it is a directory
			// nobody will ever come back for
			workDir = mkdtempSync(join(tmpdir(), "jiscribe-mcp-browser-"));
			const reportPath = join(workDir, "profile-path");
			const fakeBrowser = writeFakeBrowser(reportPath);

			openBrowser("http://localhost:1/", {
				mode: "headless",
				browserCommand: fakeBrowser,
			});
			await waitFor(() => existsSync(reportPath));
			const profilePath = readFileSync(reportPath, "utf8");

			expect(profilePath).not.toBe("");
			expect(profilePath.startsWith(tmpdir())).toBe(true);
			await waitFor(() => !existsSync(profilePath));
		},
	);
});
