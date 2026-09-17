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
//
// The directory is made here rather than left to Chromium, and made with a name
// nobody can work out in advance (mkdtemp): a name that could be guessed is one
// another user of a shared /tmp can put a directory or a link at first. Each one
// says in an `owner.json` which process it belongs to, which is what lets a later
// run tell a profile still in use from one a killed process left behind.

import { spawnSync } from "node:child_process";
import {
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
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

/** The name every profile directory starts with, whichever process made it */
const PROFILE_NAME_PREFIX = "jiscribe-mcp-headless-";

/** The file naming the process a profile belongs to, written as it is created */
const OWNER_FILE_NAME = "owner.json";

/**
 * How long a profile with no readable owner is left alone. A directory being made
 * right now by another process looks exactly like one whose owner file was lost,
 * so nothing is taken away until no browser could still be starting into it
 */
const ORPHAN_SWEEP_AGE_MS = 24 * 60 * 60 * 1_000;

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
 * Whether a process is there to be signalled.
 *
 * @param pid The pid read out of an owner file, which is whatever was written
 *   there rather than something known to be a pid at all
 * @returns Whether it names a live process. A pid that is not a positive whole
 *   number names none (and is never signalled: 0 and the negatives stand for
 *   whole process groups)
 */
const isProcessAlive = (pid: number): boolean => {
	if (!Number.isInteger(pid) || pid <= 0) {
		return false;
	}
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		// Only "no such process" says it is gone; EPERM is a process this user is
		// not allowed to signal, which is a process all the same
		return !(
			error instanceof Error &&
			(error as NodeJS.ErrnoException).code === "ESRCH"
		);
	}
};

/**
 * Reads which process a profile directory belongs to.
 *
 * @param profileDir The directory to ask about
 * @returns The pid its owner file names, or null when there is no such file, it
 *   cannot be read, or it holds anything but a pid
 */
const readOwnerPid = (profileDir: string): number | null => {
	let owner: unknown;
	try {
		owner = JSON.parse(
			readFileSync(path.join(profileDir, OWNER_FILE_NAME), "utf8"),
		);
	} catch {
		return null;
	}
	if (typeof owner !== "object" || owner === null) {
		return null;
	}
	const pid = (owner as { pid?: unknown }).pid;
	return typeof pid === "number" ? pid : null;
};

/**
 * Whether nothing has touched a directory for a while.
 *
 * @param target The directory to look at
 * @param ageMs How old it has to be to count. A directory that cannot be stat'd
 *   counts as young, so nothing is removed on the strength of a failed look
 */
const isOlderThan = (target: string, ageMs: number): boolean => {
	try {
		return Date.now() - statSync(target).mtimeMs > ageMs;
	} catch {
		return false;
	}
};

/**
 * Removes the profiles left behind by processes that are gone, which is what a
 * server killed outright leaves.
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
			if (!name.startsWith(PROFILE_NAME_PREFIX)) {
				continue;
			}
			const target = path.join(parent, name);
			const ownerPid = readOwnerPid(target);
			if (ownerPid !== null) {
				if (!isProcessAlive(ownerPid)) {
					removeQuietly(target);
				}
				continue;
			}
			// With nobody to ask, age is all there is to go on
			if (isOlderThan(target, ORPHAN_SWEEP_AGE_MS)) {
				removeQuietly(target);
			}
		}
	}
};

/**
 * Makes one profile directory and puts this process's name on it.
 *
 * @param parent The directory to make it in, as this process sees it
 * @returns The directory, whose name mkdtemp made unguessable and which POSIX
 *   gives to its owner alone (0700)
 * @throws Whatever stopped the directory from being made or written to
 */
const createProfileDir = (parent: string): string => {
	const profileDir = mkdtempSync(path.join(parent, PROFILE_NAME_PREFIX));
	writeFileSync(
		path.join(profileDir, OWNER_FILE_NAME),
		`${JSON.stringify({ pid: process.pid })}\n`,
		"utf8",
	);
	return profileDir;
};

/**
 * Makes the profile directory for one headless launch, one per side that may run
 * the browser.
 *
 * @param platform The value of `process.platform`. Anything but win32 / darwin is
 *   treated as Linux, which is where WSL puts a Windows-side .exe among the
 *   candidates and so is the only case that asks Windows anything
 * @param resolveWindowsTemp Where the Windows-side profile goes. Only tests pass
 *   it; the default asks Windows once per process and keeps the answer
 * @returns The paths to name, and the removal that takes the profiles away. Call
 *   `remove` once the browser is gone; until then the directory holds a running
 *   Chromium's state
 * @throws Whatever stopped the profile on this side from being made. A
 *   Windows-side one that cannot be made is carried as a reason instead, the same
 *   way a Windows that could not be asked is
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
	const nativePath = createProfileDir(tmpdir());
	const targets = [nativePath];

	/**
	 * Makes the profile a Windows-side browser would run on, where Windows itself
	 * said to put it. It is a directory of its own, since each side makes one where
	 * that side can reach it, and Windows is given the name this one ended up with
	 */
	const createWindowsProfile = (): WindowsProfileOutcome => {
		if (!windowsTemp.ok) {
			return { ok: false, reason: windowsTemp.reason };
		}
		try {
			const windowsSideDir = createProfileDir(windowsTemp.dir.wslPath);
			targets.push(windowsSideDir);
			return {
				ok: true,
				path: `${windowsTemp.dir.windowsPath}\\${path.basename(windowsSideDir)}`,
			};
		} catch (error) {
			return {
				ok: false,
				reason: `no profile directory could be made under ${windowsTemp.dir.windowsPath} (${String(error)})`,
			};
		}
	};
	const windows = createWindowsProfile();

	return {
		paths: { nativePath, windows },
		remove: () => {
			for (const target of targets) {
				removeQuietly(target);
			}
		},
	};
};
