import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
	calcWindowsTempFromEcho,
	createHeadlessProfile,
	createWindowsTempResolver,
	probeWindowsTempDir,
	type WindowsTempOutcome,
} from "../host/headlessProfile";

/** What every profile of this process is named after (see headlessProfile) */
const NAME_PREFIX = `jiscribe-mcp-headless-${process.pid}-`;

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
	it("names a directory of its own for every launch, so two never collide", () => {
		const first = createHeadlessProfile("linux", () => NO_WINDOWS);
		const second = createHeadlessProfile("linux", () => NO_WINDOWS);

		expect(first.paths.nativePath).not.toBe(second.paths.nativePath);
		for (const profile of [first, second]) {
			// Under the temporary directory, not the profile the user's browser runs
			// on, which is the whole point of naming one
			expect(profile.paths.nativePath.startsWith(tmpdir())).toBe(true);
			expect(profile.paths.nativePath).toContain(NAME_PREFIX);
		}
	});

	it("puts the Windows-side profile under the directory Windows named", () => {
		// A Windows-side browser reads a POSIX path as one rooted on whatever drive
		// it started on, so it is given a path from Windows' own answer
		const windowsTemp = fakeWindowsTemp();
		const profile = createHeadlessProfile("linux", () => windowsTemp);

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

		expect(profile.paths.windows).toEqual(NO_WINDOWS);
	});

	it("never asks Windows anything on a platform that has no WSL", () => {
		let askCount = 0;

		const profile = createHeadlessProfile("darwin", () => {
			askCount += 1;
			return NO_WINDOWS;
		});

		expect(askCount).toBe(0);
		expect(profile.paths.windows.ok).toBe(false);
	});

	it("takes both directories away once the browser is done with them", () => {
		// The Windows-side one is removed through the name that answer came with,
		// not through a /mnt/c the probe never mentioned
		const windowsTemp = fakeWindowsTemp();
		const profile = createHeadlessProfile("linux", () => windowsTemp);
		const windowsSideDir = makeDir(
			join(
				windowsTemp.ok ? windowsTemp.dir.wslPath : "",
				basename(profile.paths.nativePath),
			),
		);
		makeDir(profile.paths.nativePath);

		profile.remove();

		expect(existsSync(profile.paths.nativePath)).toBe(false);
		expect(existsSync(windowsSideDir)).toBe(false);
	});

	it("removes what a process killed before it could clean up left behind", () => {
		// The pid is in the name, and no two live processes share one, so anything
		// found under this prefix belongs to a process that is gone
		const windowsTemp = fakeWindowsTemp();
		const leftover = makeDir(join(tmpdir(), `${NAME_PREFIX}stale`));
		const windowsSideLeftover = makeDir(
			join(
				windowsTemp.ok ? windowsTemp.dir.wslPath : "",
				`${NAME_PREFIX}stale`,
			),
		);

		createHeadlessProfile("linux", () => windowsTemp);

		expect(existsSync(leftover)).toBe(false);
		expect(existsSync(windowsSideLeftover)).toBe(false);
	});

	it("leaves the profile of a browser still running alone", () => {
		const live = createHeadlessProfile("linux", () => NO_WINDOWS);
		makeDir(live.paths.nativePath);

		createHeadlessProfile("linux", () => NO_WINDOWS);

		expect(existsSync(live.paths.nativePath)).toBe(true);
		live.remove();
	});

	it("removes nothing and reports no failure when there is nothing to remove", () => {
		const profile = createHeadlessProfile("linux", () => NO_WINDOWS);

		expect(() => {
			profile.remove();
			profile.remove();
		}).not.toThrow();
	});
});
