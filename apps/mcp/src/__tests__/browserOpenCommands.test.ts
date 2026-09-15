import { describe, expect, it } from "vitest";

import {
	calcBrowserOpenCommands,
	calcBrowserOpenPreference,
} from "../host/browserOpenCommands";

const URL = "http://localhost:5190";

/** The switches headless mode puts before the URL (see browserOpenCommands) */
const HEADLESS_ARGS = [
	"--headless=new",
	"--disable-gpu",
	"--disable-background-timer-throttling",
	"--disable-renderer-backgrounding",
	"--disable-backgrounding-occluded-windows",
];

/** Stands in for the throwaway profile a headless launch is given */
const PROFILE = {
	nativePath: "/tmp/jiscribe-mcp-headless-1-1",
	windows: {
		ok: true as const,
		path: "C:\\Users\\maver\\AppData\\Local\\Temp\\jiscribe-mcp-headless-1-1",
	},
};

/** The same, on a machine where Windows could not say where to put the profile */
const PROFILE_WITHOUT_WINDOWS = {
	nativePath: PROFILE.nativePath,
	windows: { ok: false as const, reason: "there is no cmd.exe here" },
};

/** The switches headless mode puts before the URL, profile included */
const headlessArgs = (profilePath: string): string[] => [
	...HEADLESS_ARGS,
	`--user-data-dir=${profilePath}`,
];

describe("calcBrowserOpenCommands", () => {
	it("returns only the default browser's candidates in tab mode", () => {
		expect(calcBrowserOpenCommands(URL, "win32", "tab")).toEqual([
			["cmd", "/c", "start", "", URL],
		]);
		expect(calcBrowserOpenCommands(URL, "darwin", "tab")).toEqual([
			["open", URL],
		]);
		expect(calcBrowserOpenCommands(URL, "linux", "tab")[0]).toEqual([
			"xdg-open",
			URL,
		]);
	});

	it("puts --app= first in app mode and falls back to a tab last", () => {
		const commands = calcBrowserOpenCommands(URL, "linux", "app");
		expect(commands[0]).toEqual(["google-chrome", `--app=${URL}`]);
		expect(commands.some(([command]) => command.endsWith("msedge.exe"))).toBe(
			true,
		);
		expect(commands.at(-1)).toEqual([
			"powershell.exe",
			"-NoProfile",
			"-Command",
			"Start-Process",
			URL,
		]);
	});

	it("tries only the named executable in app mode, then falls back to a tab", () => {
		const commands = calcBrowserOpenCommands(URL, "linux", "app", "msedge.exe");
		expect(commands[0]).toEqual(["msedge.exe", `--app=${URL}`]);
		expect(commands[1]).toEqual(["xdg-open", URL]);
	});

	it("leaves win32's app mode to start, so that App Paths is consulted", () => {
		expect(calcBrowserOpenCommands(URL, "win32", "app")[0]).toEqual([
			"cmd",
			"/c",
			"start",
			"",
			"chrome",
			`--app=${URL}`,
		]);
	});

	it("names the Chromium binary itself in headless mode, on every platform", () => {
		// Anything that hands the URL to the registered browser through a shell
		// helper loses the process, and with it the chance to ask for headless
		expect(
			calcBrowserOpenCommands(URL, "linux", "headless", undefined, PROFILE)[0],
		).toEqual(["google-chrome", ...headlessArgs(PROFILE.nativePath), URL]);
		expect(
			calcBrowserOpenCommands(URL, "win32", "headless", undefined, PROFILE)[0],
		).toEqual([
			"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
			// Windows is this process's own platform here, so the .exe reads the
			// native path as it is written
			...headlessArgs(PROFILE.nativePath),
			URL,
		]);
		expect(
			calcBrowserOpenCommands(URL, "darwin", "headless", undefined, PROFILE)[0],
		).toEqual([
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			...headlessArgs(PROFILE.nativePath),
			URL,
		]);
	});

	it("keeps the Windows-side .exe paths in linux's headless mode, for WSL", () => {
		const commands = calcBrowserOpenCommands(
			URL,
			"linux",
			"headless",
			undefined,
			PROFILE,
		);
		const windowsSideCommand = commands.find(([command]) =>
			command.endsWith("chrome.exe"),
		);

		expect(windowsSideCommand).toBeDefined();
		// Such a browser reads a POSIX path as one rooted on whatever drive it
		// started on, so it is given the profile in Windows form
		expect(windowsSideCommand?.slice(1)).toEqual([
			...headlessArgs(PROFILE.windows.path),
			URL,
		]);
	});

	it("leaves out the Windows-side browsers when there is no profile to give them", () => {
		// Running them on the user's own profile is the one thing that must not
		// happen, so they are dropped rather than launched without one
		const commands = calcBrowserOpenCommands(
			URL,
			"linux",
			"headless",
			undefined,
			PROFILE_WITHOUT_WINDOWS,
		);

		expect(commands.some(([command]) => command.endsWith(".exe"))).toBe(false);
		expect(commands[0][0]).toBe("google-chrome");
	});

	it("comes back empty when the only browser named is one it cannot place", () => {
		expect(
			calcBrowserOpenCommands(
				URL,
				"linux",
				"headless",
				"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
				PROFILE_WITHOUT_WINDOWS,
			),
		).toEqual([]);
	});

	it("puts every headless candidate on a profile of its own", () => {
		// Left on the user's own profile, the launch is handed to the browser they
		// already have open: either nothing of ours runs, or a window appears on
		// the screen headless was asked to keep clear
		for (const platform of ["linux", "win32", "darwin"] as const) {
			const commands = calcBrowserOpenCommands(
				URL,
				platform,
				"headless",
				undefined,
				PROFILE,
			);
			for (const [, ...args] of commands) {
				expect(args.some((arg) => arg.startsWith("--user-data-dir="))).toBe(
					true,
				);
			}
		}
	});

	it("refuses a headless launch with no profile of its own to run on", () => {
		// Quietly going back to the user's profile is the failure this is here to
		// prevent, so a caller that forgets hears about it
		expect(() => calcBrowserOpenCommands(URL, "linux", "headless")).toThrow(
			/profile directory/,
		);
	});

	it("never falls back to a tab in headless mode", () => {
		// The default browser has no headless mode, so a fallback would put a
		// window on the user's screen behind their back
		const tabLaunchers = new Set(["cmd", "open", "xdg-open", "wslview"]);
		for (const platform of ["linux", "win32", "darwin"] as const) {
			const commands = calcBrowserOpenCommands(
				URL,
				platform,
				"headless",
				undefined,
				PROFILE,
			);
			expect(commands.some(([command]) => tabLaunchers.has(command))).toBe(
				false,
			);
		}
	});

	it("tries only the named executable in headless mode", () => {
		expect(
			calcBrowserOpenCommands(URL, "linux", "headless", "/opt/chrome", PROFILE),
		).toEqual([["/opt/chrome", ...headlessArgs(PROFILE.nativePath), URL]]);
	});

	it("passes everything after --args through open -na in darwin's app mode", () => {
		expect(calcBrowserOpenCommands(URL, "darwin", "app")[0]).toEqual([
			"open",
			"-na",
			"Google Chrome",
			"--args",
			`--app=${URL}`,
		]);
	});
});

describe("calcBrowserOpenPreference", () => {
	it("reads unset, empty and app as app mode", () => {
		expect(calcBrowserOpenPreference(undefined)).toEqual({ mode: "app" });
		expect(calcBrowserOpenPreference("  ")).toEqual({ mode: "app" });
		expect(calcBrowserOpenPreference("app")).toEqual({ mode: "app" });
	});

	it("reads tab / default as a tab in the default browser", () => {
		expect(calcBrowserOpenPreference("tab")).toEqual({ mode: "tab" });
		expect(calcBrowserOpenPreference("default")).toEqual({ mode: "tab" });
	});

	it("reads anything else as naming the executable to use in app mode", () => {
		expect(
			calcBrowserOpenPreference(
				" /mnt/c/Program Files/Google/Chrome/Application/chrome.exe ",
			),
		).toEqual({
			mode: "app",
			browserCommand:
				"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
		});
	});
});
