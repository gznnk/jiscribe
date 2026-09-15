// The throwaway Chromium profile a headless window runs on.
//
// Without one, a headless launch reuses the profile the user's own browser is
// already running on, which that browser holds a singleton lock over: the launch
// is then handed to the running instance, which either leaves nothing of ours
// running or puts a visible window on the screen headless was asked to keep
// clear.
//
// A Windows-side browser reached from WSL needs its own answer, since it reads a
// POSIX path as one rooted on whatever drive it started on. Its profile goes in
// that user's Windows TEMP, which only Windows itself can name, so it is asked
// (probeWindowsTempDir). Nothing is guessed when the answer does not come: the
// candidates that would have needed it are left out of the launch, and the
// reason is carried through to what the caller is told.

import { spawnSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Where a headless Chromium is told to keep its profile, in the forms it can need */
export type HeadlessProfilePaths = {
	/** For a browser that reads a path the way this process does (absolute) */
	nativePath: string;
	/**
	 * For a Windows-side .exe launched from WSL, or why there is no such path.
	 * A candidate that would need one is dropped rather than run without it
	 */
	windows: WindowsProfileOutcome;
};

/** The Windows-form profile path, or what stopped it from being worked out */
export type WindowsProfileOutcome =
	{ ok: true; path: string } | { ok: false; reason: string };

/** One launch's profile: where to put it, and how to take it away again */
export type HeadlessProfile = {
	/** The paths to name on the command line, one per kind of candidate */
	paths: HeadlessProfilePaths;
	/** Removes what the browser left behind. Idempotent, and never throws */
	remove: () => void;
};

/** A directory on the Windows side, named the way each side has to see it */
export type WindowsTempDir = {
	/** Windows form, as the browser is given it (no trailing separator) */
	windowsPath: string;
	/** The same directory as this process sees it, for making and removing profiles */
	wslPath: string;
};

/** The Windows TEMP directory, or why asking for it did not work */
export type WindowsTempOutcome =
	{ ok: true; dir: WindowsTempDir } | { ok: false; reason: string };

/** How long Windows is given to answer either question (milliseconds) */
const PROBE_TIMEOUT_MS = 5_000;

/** A path rooted on a drive letter, which is what an answer from Windows looks like */
const WINDOWS_PATH_PATTERN = /^[A-Za-z]:\\/;

/**
 * The name every profile of this process starts with. The pid is in it because
 * no two live processes share one: a directory found under this prefix belongs
 * to a process that is gone, and is ours to sweep away
 */
const profileNamePrefix = `jiscribe-mcp-headless-${process.pid}-`;

/** How many profiles this process has named, so that two launches never collide */
let profileCount = 0;

/** The profiles handed out and not yet removed, which the sweep has to leave alone */
const liveProfileNames = new Set<string>();

/**
 * Picks the Windows path out of what `cmd.exe /c echo %TEMP%` printed.
 *
 * @param output The command's standard output. cmd puts its own remarks (the one
 *   about a UNC working directory, for instance) on standard error, but the last
 *   drive-rooted line is taken all the same, so a stray one in front is harmless
 * @returns The directory with any trailing separator removed, or null when there
 *   is no Windows path in there at all — which is what an unexpanded `%TEMP%`
 *   looks like
 */
export const calcWindowsTempFromEcho = (output: string): string | null => {
	const candidates = output
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => WINDOWS_PATH_PATTERN.test(line));
	const answer = candidates.at(-1);
	if (answer === undefined) {
		return null;
	}
	// A drive root is the one place the separator is part of the name
	return answer.length > 3 ? answer.replace(/\\+$/, "") : answer;
};

/**
 * Asks Windows where this user's TEMP directory is, and this side what that same
 * directory is called here. Both questions are put to a process, so this is only
 * worth asking once (see createWindowsTempResolver).
 *
 * @returns The directory in both forms, or the reason it could not be had: no
 *   cmd.exe (which is every machine that is not WSL), a cmd that answered with
 *   something that is not a path, or a wslpath that could not convert it
 */
export const probeWindowsTempDir = (): WindowsTempOutcome => {
	const echoed = spawnSync("cmd.exe", ["/d", "/c", "echo %TEMP%"], {
		encoding: "utf8",
		timeout: PROBE_TIMEOUT_MS,
	});
	if (echoed.error !== undefined) {
		// No cmd.exe at all is the ordinary state of a machine that is not WSL, and
		// reads as a broken probe unless it is said plainly
		if ("code" in echoed.error && echoed.error.code === "ENOENT") {
			return {
				ok: false,
				reason:
					"there is no cmd.exe here to ask where Windows keeps TEMP, so this is not WSL",
			};
		}
		return {
			ok: false,
			reason: `Windows could not be asked where its TEMP directory is (${String(echoed.error)})`,
		};
	}
	if (echoed.status !== 0) {
		return {
			ok: false,
			reason: `cmd.exe left with ${String(echoed.status)} when asked for %TEMP%`,
		};
	}
	const windowsPath = calcWindowsTempFromEcho(echoed.stdout);
	if (windowsPath === null) {
		return {
			ok: false,
			reason: `cmd.exe answered with no Windows path when asked for %TEMP% (${JSON.stringify(echoed.stdout.trim())})`,
		};
	}
	const converted = spawnSync("wslpath", ["-u", windowsPath], {
		encoding: "utf8",
		timeout: PROBE_TIMEOUT_MS,
	});
	if (converted.error !== undefined || converted.status !== 0) {
		return {
			ok: false,
			reason: `wslpath could not say what ${windowsPath} is called on this side (${String(converted.error ?? converted.stderr.trim())})`,
		};
	}
	const wslPath = converted.stdout.trim();
	if (wslPath === "") {
		return {
			ok: false,
			reason: `wslpath answered with nothing when asked about ${windowsPath}`,
		};
	}
	return { ok: true, dir: { windowsPath, wslPath } };
};

/**
 * Wraps a probe so it is run once and its answer kept, the failure included: a
 * machine with no Windows to ask must not be asked again on every launch.
 *
 * @param probe What to ask. Called at most once, on the first resolve
 * @returns The resolver. Every call after the first gives back the first answer
 */
export const createWindowsTempResolver = (
	probe: () => WindowsTempOutcome,
): (() => WindowsTempOutcome) => {
	let cachedOutcome: WindowsTempOutcome | null = null;
	return () => {
		cachedOutcome ??= probe();
		return cachedOutcome;
	};
};

const resolveWindowsTempDir = createWindowsTempResolver(probeWindowsTempDir);

const removeQuietly = (target: string): void => {
	try {
		rmSync(target, { recursive: true, force: true });
	} catch {
		// A profile a browser still holds open, or a directory this process is not
		// allowed to write to. Leaving it behind beats failing the launch over it
	}
};

/**
 * Removes the profiles left by an earlier process that carried this pid, which is
 * what a server killed outright leaves behind.
 *
 * @param parents The directories profiles are made in, in the order they are read
 */
const sweepLeftovers = (parents: readonly string[]): void => {
	for (const parent of parents) {
		let names: string[];
		try {
			names = readdirSync(parent);
		} catch {
			continue;
		}
		for (const name of names) {
			if (name.startsWith(profileNamePrefix) && !liveProfileNames.has(name)) {
				removeQuietly(path.join(parent, name));
			}
		}
	}
};

/**
 * Names a profile directory for one headless launch. Nothing is created here:
 * Chromium makes the directory it is given, and only the candidate that actually
 * starts ever makes one.
 *
 * @param platform The value of `process.platform`. Anything but win32 / darwin is
 *   treated as Linux, which is where WSL puts a Windows-side .exe among the
 *   candidates and so is the only case that asks Windows anything
 * @param resolveWindowsTemp Where the Windows-side profile goes. Only tests pass
 *   it; the default asks Windows once per process and keeps the answer
 * @returns The paths to name, and the removal that takes the profile away. Call
 *   `remove` once the browser is gone; until then the directory holds a running
 *   Chromium's state
 */
export const createHeadlessProfile = (
	platform: NodeJS.Platform,
	resolveWindowsTemp: () => WindowsTempOutcome = resolveWindowsTempDir,
): HeadlessProfile => {
	const windowsTemp: WindowsTempOutcome =
		platform === "win32" || platform === "darwin"
			? {
					ok: false,
					reason: "a Windows-side browser is only ever reached from WSL",
				}
			: resolveWindowsTemp();
	const parents = [
		tmpdir(),
		...(windowsTemp.ok ? [windowsTemp.dir.wslPath] : []),
	];
	sweepLeftovers(parents);
	profileCount += 1;
	const name = `${profileNamePrefix}${profileCount}`;
	liveProfileNames.add(name);
	const targets = parents.map((parent) => path.join(parent, name));
	return {
		paths: {
			nativePath: path.join(tmpdir(), name),
			windows: windowsTemp.ok
				? { ok: true, path: `${windowsTemp.dir.windowsPath}\\${name}` }
				: { ok: false, reason: windowsTemp.reason },
		},
		remove: () => {
			liveProfileNames.delete(name);
			for (const target of targets) {
				removeQuietly(target);
			}
		},
	};
};
