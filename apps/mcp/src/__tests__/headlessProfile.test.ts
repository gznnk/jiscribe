import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
	utimesSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
	calcWindowsTempFromEcho,
	createHeadlessProfile,
	createWindowsTempResolver,
	probeWindowsTempDir,
	type WindowsTempOutcome,
} from "../host/headlessProfile";

/** What every profile directory is named after, whichever process made it */
const NAME_PREFIX = "jiscribe-mcp-headless-";

/** How old a profile with no owner has to be before the sweep takes it (24 hours) */
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1_000;

/**
 * A pid nothing is running under, for standing in as the process a leftover
 * profile belonged to.
 *
 * @returns The first pid at or below the starting point that no process answers
 *   to. A pid past the system's maximum answers to nothing either, so the search
 *   ends at once on a machine with few processes
 */
const findDeadPid = (): number => {
	for (let candidate = 999_000; candidate > 1; candidate -= 1) {
		try {
			process.kill(candidate, 0);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ESRCH") {
				return candidate;
			}
		}
	}
	throw new Error("every pid on this machine is taken");
};

/**
 * Puts a profile directory where an earlier run would have left one.
 *
 * @param parent The directory to make it in
 * @param owner What to write in its owner file: a pid, or null for the profile
 *   whose owner file was never written or cannot be read
 * @param ageMs How long ago it was last touched (milliseconds), for the sweep
 *   that goes by age where there is no owner to ask
 */
const makeLeftover = (
	parent: string,
	owner: number | null,
	ageMs = 0,
): string => {
	const dir = makeDir(join(parent, `${NAME_PREFIX}${String(owner)}-${ageMs}`));
	if (owner !== null) {
		writeFileSync(join(dir, "owner.json"), JSON.stringify({ pid: owner }));
	}
	const touchedAt = new Date(Date.now() - ageMs);
	utimesSync(dir, touchedAt, touchedAt);
	return dir;
};

/** Why a machine that is not WSL has no Windows-side profile directory */
const NO_WINDOWS: WindowsTempOutcome = {
	ok: false,
	reason: "there is no cmd.exe here",
};

const madeDirs: string[] = [];

const makeDir = (path: string): string => {
	mkdirSync(path, { recursive: true });
	writeFileSync(join(path, "Local State"), "{}", "utf8");
	madeDirs.push(path);
	return path;
};

/**
 * A Windows TEMP that this process can actually reach, so that what is made and
 * removed under it can be looked at. Only the Windows form is make-believe
 */
const fakeWindowsTemp = (): WindowsTempOutcome => {
	const wslPath = mkdtempSync(join(tmpdir(), "jiscribe-mcp-wintemp-"));
	madeDirs.push(wslPath);
	return {
		ok: true,
		dir: { windowsPath: "D:\\Users\\someone\\AppData\\Local\\Temp", wslPath },
	};
};

afterEach(() => {
	for (const dir of madeDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe("calcWindowsTempFromEcho", () => {
	it("reads the path cmd.exe echoed back", () => {
		expect(
			calcWindowsTempFromEcho("C:\\Users\\maver\\AppData\\Local\\Temp\r\n"),
		).toBe("C:\\Users\\maver\\AppData\\Local\\Temp");
	});

	it("takes the last path, so a remark printed first is passed over", () => {
		expect(
			calcWindowsTempFromEcho("Z:\\some\\noise\r\nD:\\Temp\\Local\r\n"),
		).toBe("D:\\Temp\\Local");
	});

	it("drops a trailing separator, but not the one a drive root is made of", () => {
		expect(calcWindowsTempFromEcho("D:\\Temp\\\r\n")).toBe("D:\\Temp");
		expect(calcWindowsTempFromEcho("D:\\\r\n")).toBe("D:\\");
	});

	it("reports nothing when the answer is not a path at all", () => {
		// An unexpanded variable is what a cmd that did not run looks like
		expect(calcWindowsTempFromEcho("%TEMP%\r\n")).toBeNull();
		expect(calcWindowsTempFromEcho("")).toBeNull();
	});
});

describe("createWindowsTempResolver", () => {
	it("asks once and keeps the answer", () => {
		let askCount = 0;
		const resolve = createWindowsTempResolver(() => {
			askCount += 1;
			return fakeWindowsTemp();
		});

		const first = resolve();
		const second = resolve();

		expect(askCount).toBe(1);
		expect(second).toBe(first);
	});

	it("keeps a failure too, so a machine with no Windows is not asked again", () => {
		let askCount = 0;
		const resolve = createWindowsTempResolver(() => {
			askCount += 1;
			return NO_WINDOWS;
		});

		resolve();
		resolve();

		expect(askCount).toBe(1);
		expect(resolve()).toEqual(NO_WINDOWS);
	});
});

describe("probeWindowsTempDir", () => {
	it("answers with a Windows path and its name on this side, or says why not", () => {
		// Both outcomes are real: WSL has a Windows to ask, a plain Linux box has
		// none. What matters is that neither comes back as a guess
		const outcome = probeWindowsTempDir();

		if (outcome.ok) {
			expect(outcome.dir.windowsPath).toMatch(/^[A-Za-z]:\\/);
			expect(outcome.dir.wslPath.startsWith("/")).toBe(true);
		} else {
			expect(outcome.reason).not.toBe("");
		}
	});
});

describe("createHeadlessProfile", () => {
	it("makes a directory of its own for every launch, with a name nobody can name first", () => {
		// A name that could be worked out in advance is one another user of a shared
		// /tmp can put a directory, or a link, at before the browser gets there
		const first = createHeadlessProfile("linux", () => NO_WINDOWS);
		const second = createHeadlessProfile("linux", () => NO_WINDOWS);
		madeDirs.push(first.paths.nativePath, second.paths.nativePath);

		expect(first.paths.nativePath).not.toBe(second.paths.nativePath);
		for (const profile of [first, second]) {
			// Under the temporary directory, not the profile the user's browser runs
			// on, which is the whole point of naming one
			expect(profile.paths.nativePath.startsWith(tmpdir())).toBe(true);
			expect(profile.paths.nativePath).toContain(NAME_PREFIX);
			expect(existsSync(profile.paths.nativePath)).toBe(true);
		}
	});

	it("says which process the profile belongs to, so a later run can tell", () => {
		const profile = createHeadlessProfile("linux", () => NO_WINDOWS);
		madeDirs.push(profile.paths.nativePath);

		expect(
			JSON.parse(
				readFileSync(join(profile.paths.nativePath, "owner.json"), "utf8"),
			),
		).toEqual({ pid: process.pid });
	});

	it.skipIf(process.platform === "win32")(
		"leaves the directory to its owner alone",
		() => {
			// Everything a headless browser is told to do goes through this
			// directory, and on a shared machine it is where another user would read
			// it from
			const profile = createHeadlessProfile("linux", () => NO_WINDOWS);
			madeDirs.push(profile.paths.nativePath);

			expect(statSync(profile.paths.nativePath).mode & 0o777).toBe(0o700);
		},
	);

	it("puts the Windows-side profile under the directory Windows named", () => {
		// A Windows-side browser reads a POSIX path as one rooted on whatever drive
		// it started on, so it is given a path from Windows' own answer
		const windowsTemp = fakeWindowsTemp();
		const profile = createHeadlessProfile("linux", () => windowsTemp);
		madeDirs.push(profile.paths.nativePath);

		expect(profile.paths.windows).toEqual({
			ok: true,
			path: expect.stringContaining(
				"D:\\Users\\someone\\AppData\\Local\\Temp\\jiscribe-mcp-headless-",
			),
		});
	});

	it("carries the reason forward when Windows could not be asked", () => {
		// Falling back to some directory everyone can write to would put a profile
		// where another user of the machine could read or plant one
		const profile = createHeadlessProfile("linux", () => NO_WINDOWS);
		madeDirs.push(profile.paths.nativePath);

		expect(profile.paths.windows).toEqual(NO_WINDOWS);
	});

	it("never asks Windows anything on a platform that has no WSL", () => {
		let askCount = 0;

		const profile = createHeadlessProfile("darwin", () => {
			askCount += 1;
			return NO_WINDOWS;
		});
		madeDirs.push(profile.paths.nativePath);

		expect(askCount).toBe(0);
		expect(profile.paths.windows.ok).toBe(false);
	});

	it("takes both directories away once the browser is done with them", () => {
		// The Windows-side one is removed through the name that answer came with,
		// not through a /mnt/c the probe never mentioned
		const windowsTemp = fakeWindowsTemp();
		const profile = createHeadlessProfile("linux", () => windowsTemp);
		const windowsSideDir = join(
			windowsTemp.ok ? windowsTemp.dir.wslPath : "",
			profile.paths.windows.ok
				? (profile.paths.windows.path.split("\\").at(-1) ?? "")
				: "",
		);
		expect(existsSync(windowsSideDir)).toBe(true);

		profile.remove();

		expect(existsSync(profile.paths.nativePath)).toBe(false);
		expect(existsSync(windowsSideDir)).toBe(false);
	});

	it("removes what a process killed before it could clean up left behind", () => {
		// The owner file names a process that is gone, and nothing it held can still
		// be in use
		const windowsTemp = fakeWindowsTemp();
		const deadPid = findDeadPid();
		const leftover = makeLeftover(tmpdir(), deadPid);
		const windowsSideLeftover = makeLeftover(
			windowsTemp.ok ? windowsTemp.dir.wslPath : "",
			deadPid,
		);

		const profile = createHeadlessProfile("linux", () => windowsTemp);
		madeDirs.push(profile.paths.nativePath);

		expect(existsSync(leftover)).toBe(false);
		expect(existsSync(windowsSideLeftover)).toBe(false);
	});

	it("leaves the profile of a browser still running alone", () => {
		// Another live server's profile, which its own browser is using: this
		// process's pid stands in for one that answers
		const leftover = makeLeftover(tmpdir(), process.pid);
		const live = createHeadlessProfile("linux", () => NO_WINDOWS);

		const following = createHeadlessProfile("linux", () => NO_WINDOWS);
		madeDirs.push(live.paths.nativePath, following.paths.nativePath);

		expect(existsSync(leftover)).toBe(true);
		expect(existsSync(live.paths.nativePath)).toBe(true);
	});

	it("leaves a profile with no owner alone until nothing could still be starting into it", () => {
		// A directory another process is making right now looks the same as one
		// whose owner file was lost
		const fresh = makeLeftover(tmpdir(), null);
		const stale = makeLeftover(tmpdir(), null, ORPHAN_AGE_MS + 60_000);

		const profile = createHeadlessProfile("linux", () => NO_WINDOWS);
		madeDirs.push(profile.paths.nativePath);

		expect(existsSync(fresh)).toBe(true);
		expect(existsSync(stale)).toBe(false);
	});

	it("removes nothing and reports no failure when there is nothing to remove", () => {
		const profile = createHeadlessProfile("linux", () => NO_WINDOWS);

		expect(() => {
			profile.remove();
			profile.remove();
		}).not.toThrow();
	});
});
