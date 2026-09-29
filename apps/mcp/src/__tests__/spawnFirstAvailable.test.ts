// Covers which candidate a launch settles on. Real processes are spawned, but
// node itself stands in for the browser: what matters is how it leaves (exit code,
// signal, never having been there at all), not what it is.

import type { ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { BrowserOpenCommand } from "../host/browserOpenCommands";
import { spawnFirstAvailable } from "../host/spawnFirstAvailable";

let workDir: string | null = null;
const runningChildren: ChildProcess[] = [];

afterEach(() => {
	for (const child of runningChildren.splice(0)) {
		child.kill("SIGKILL");
	}
	if (workDir !== null) {
		rmSync(workDir, { recursive: true, force: true });
		workDir = null;
	}
});

/** A node command standing in for a browser candidate */
const nodeCommand = (script: string): BrowserOpenCommand => [
	process.execPath,
	"-e",
	script,
];

/** A path no executable is at, so the candidate fails with ENOENT */
const MISSING_COMMAND: BrowserOpenCommand = [
	join(tmpdir(), "jiscribe-mcp-no-such-browser"),
];

/**
 * How long a browser has to be up before its exit stops counting as a failed
 * launch. Shortened from the three seconds of the real thing
 */
const TEST_LAUNCH_WINDOW_MS = 200;

/** Records everything the chain reports, so a test can say what did not happen */
const runCandidates = (
	commands: readonly BrowserOpenCommand[],
	isChildTheBrowser: boolean,
	launchFailureWindowMs: number = TEST_LAUNCH_WINDOW_MS,
): {
	advancedTo: number[];
	spawned: ChildProcess[];
	exhaustedReasons: string[];
} => {
	const advancedTo: number[] = [];
	const spawned: ChildProcess[] = [];
	const exhaustedReasons: string[] = [];
	spawnFirstAvailable(commands, {
		onAdvance: (nextIndex) => {
			advancedTo.push(nextIndex);
		},
		onSpawn: (child) => {
			spawned.push(child);
			runningChildren.push(child);
		},
		onExhausted: (reason) => {
			exhaustedReasons.push(reason);
		},
		isChildTheBrowser,
		launchFailureWindowMs,
	});
	return { advancedTo, spawned, exhaustedReasons };
};

const waitFor = async (isDone: () => boolean): Promise<void> => {
	for (let attempt = 0; attempt < 400; attempt += 1) {
		if (isDone()) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	throw new Error("timed out waiting for the launch to get where it was going");
};

const waitForExit = async (child: ChildProcess): Promise<void> => {
	await new Promise<void>((resolve) => {
		child.once("close", () => {
			resolve();
		});
	});
	// One turn more, so that a fallback the exit set off would have happened
	await new Promise((resolve) => setTimeout(resolve, 50));
};

describe("spawnFirstAvailable", () => {
	it("drops to the next candidate when the executable is not there", async () => {
		const run = runCandidates([MISSING_COMMAND, nodeCommand("")], true);

		await waitFor(() => run.advancedTo.length === 1);
		expect(run.advancedTo).toEqual([1]);
		expect(run.exhaustedReasons).toEqual([]);
	});

	it("reports the last failure once every candidate is gone", async () => {
		const run = runCandidates([MISSING_COMMAND, MISSING_COMMAND], true);

		await waitFor(() => run.exhaustedReasons.length === 1);
		expect(run.exhaustedReasons[0]).toContain("ENOENT");
	});

	it("never starts a second browser once one has been up and running", async () => {
		// A browser exiting long after it was launched has been closed, killed or
		// has crashed. Treating that as a failed launch put another window up,
		// pointed at a host that had already been folded away
		const run = runCandidates(
			[
				nodeCommand(
					`setTimeout(() => process.exit(3), ${TEST_LAUNCH_WINDOW_MS * 3})`,
				),
				nodeCommand(""),
			],
			true,
		);
		await waitFor(() => run.spawned.length === 1);

		await waitForExit(run.spawned[0]);

		expect(run.advancedTo).toEqual([]);
		expect(run.spawned).toHaveLength(1);
		expect(run.exhaustedReasons).toEqual([]);
	});

	it("still drops to the next browser when one dies as it starts", async () => {
		// A Chromium that cannot start at all is gone in a moment, and the next one
		// installed is worth trying. That is the only exit that means anything
		const run = runCandidates(
			[nodeCommand("process.exit(3)"), nodeCommand("")],
			true,
		);

		await waitFor(() => run.advancedTo.length === 1);
		expect(run.advancedTo).toEqual([1]);
	});

	it("does not read a process it killed itself as a launch that failed", async () => {
		// Windows has no signals: a killed process is reported as an exit code,
		// which is the same shape as a browser that could not start
		const madeDir = mkdtempSync(join(tmpdir(), "jiscribe-mcp-spawn-"));
		workDir = madeDir;
		const readyPath = join(madeDir, "ready");
		const run = runCandidates(
			[
				nodeCommand(
					`process.on("SIGTERM", () => process.exit(3));` +
						`setInterval(() => {}, 1000);` +
						`require("node:fs").writeFileSync(${JSON.stringify(readyPath)}, "");`,
				),
				nodeCommand(""),
			],
			true,
			// Long enough that only the kill being recognised can keep the next
			// candidate from being tried
			10_000,
		);
		await waitFor(() => existsSync(readyPath));

		run.spawned[0].kill();
		await waitForExit(run.spawned[0]);

		expect(run.advancedTo).toEqual([]);
		expect(run.exhaustedReasons).toEqual([]);
	});

	it("drops to the next candidate when a launcher exits with a failure", async () => {
		// macOS's `open -na` and Windows's `start` launch fine and leave with a code
		// when there was nothing for them to launch
		const run = runCandidates(
			[nodeCommand("process.exit(4)"), nodeCommand("")],
			false,
		);

		await waitFor(() => run.advancedTo.length === 1);
		expect(run.advancedTo).toEqual([1]);
	});

	it("settles on a launcher that hands the URL over and leaves with 0", async () => {
		const run = runCandidates([nodeCommand(""), nodeCommand("")], false);
		await waitFor(() => run.spawned.length === 1);

		await waitForExit(run.spawned[0]);

		expect(run.advancedTo).toEqual([]);
		expect(run.spawned).toHaveLength(1);
	});
});
