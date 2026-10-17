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
	exhaustedStderrs: string[];
} => {
	const advancedTo: number[] = [];
	const spawned: ChildProcess[] = [];
	const exhaustedReasons: string[] = [];
	const exhaustedStderrs: string[] = [];
	spawnFirstAvailable(commands, {
		onAdvance: (nextIndex) => {
			advancedTo.push(nextIndex);
		},
		onSpawn: (child) => {
			spawned.push(child);
			runningChildren.push(child);
		},
		onExhausted: (reason, stderr) => {
			exhaustedReasons.push(reason);
			exhaustedStderrs.push(stderr);
		},
		isChildTheBrowser,
		launchFailureWindowMs,
	});
	return { advancedTo, spawned, exhaustedReasons, exhaustedStderrs };
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

	// Windows has no signals to die on
	it.skipIf(process.platform === "win32")(
		"drops to the next browser when one kills itself as it starts, and names the signal",
		async () => {
			// A Chromium whose sandbox cannot be set up goes down on a signal, not an
			// exit code. Read as nothing, that left the next candidate untried and the
			// caller waiting the full connect timeout for a page that was never coming.
			// (Chromium's is SIGTRAP; a signal that dumps core takes seconds to kill a
			// node on some machines, so the stand-in dies on one that does not)
			const run = runCandidates(
				[
					nodeCommand('process.kill(process.pid, "SIGTERM")'),
					nodeCommand('process.kill(process.pid, "SIGTERM")'),
				],
				true,
			);

			await waitFor(() => run.exhaustedReasons.length === 1);
			expect(run.advancedTo).toEqual([1]);
			expect(run.exhaustedReasons[0]).toContain("SIGTERM");
		},
	);

	it("hands over what a browser wrote to stderr before it died", async () => {
		// The exit code or signal says that it died; what it wrote says why
		const run = runCandidates(
			[
				nodeCommand(
					'console.error("No usable sandbox!"); console.error("second line"); process.exit(1)',
				),
			],
			true,
		);

		await waitFor(() => run.exhaustedReasons.length === 1);
		expect(run.exhaustedReasons[0]).toContain("exited with 1");
		expect(run.exhaustedStderrs[0]).toContain("No usable sandbox!");
		expect(run.exhaustedStderrs[0]).toContain("second line");
	});

	it("keeps the head of a browser's stderr and drops the rest", async () => {
		// Chromium explains itself first and traces afterwards, and a browser
		// writing without end must not be let fill the parent's memory
		const run = runCandidates(
			[
				nodeCommand(
					'process.stderr.write("head\\n" + "x".repeat(40_000)); process.exit(1)',
				),
			],
			true,
		);

		await waitFor(() => run.exhaustedReasons.length === 1);
		expect(run.exhaustedStderrs[0].startsWith("head\n")).toBe(true);
		expect(run.exhaustedStderrs[0].length).toBeLessThan(40_000);
	});

	it("does not read a launcher's stderr", async () => {
		// A launcher is left to outlive this process, and an open pipe to it would
		// hold this process up until the launcher let go
		const run = runCandidates(
			[nodeCommand('console.error("noise"); process.exit(4)')],
			false,
		);

		await waitFor(() => run.exhaustedReasons.length === 1);
		expect(run.exhaustedStderrs).toEqual([""]);
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
