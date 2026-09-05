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
		expect(calcBrowserOpenCommands(URL, "linux", "headless")[0]).toEqual([
			"google-chrome",
			...HEADLESS_ARGS,
			URL,
		]);
		expect(calcBrowserOpenCommands(URL, "win32", "headless")[0]).toEqual([
			"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
			...HEADLESS_ARGS,
			URL,
		]);
		expect(calcBrowserOpenCommands(URL, "darwin", "headless")[0]).toEqual([
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			...HEADLESS_ARGS,
			URL,
		]);
	});

	it("keeps the Windows-side .exe paths in linux's headless mode, for WSL", () => {
		const commands = calcBrowserOpenCommands(URL, "linux", "headless");
		expect(commands.some(([command]) => command.endsWith("chrome.exe"))).toBe(
			true,
		);
	});

	it("never falls back to a tab in headless mode", () => {
		// The default browser has no headless mode, so a fallback would put a
		// window on the user's screen behind their back
		const tabLaunchers = new Set(["cmd", "open", "xdg-open", "wslview"]);
		for (const platform of ["linux", "win32", "darwin"] as const) {
			const commands = calcBrowserOpenCommands(URL, platform, "headless");
			expect(commands.some(([command]) => tabLaunchers.has(command))).toBe(
				false,
			);
		}
	});

	it("tries only the named executable in headless mode", () => {
		expect(
			calcBrowserOpenCommands(URL, "linux", "headless", "/opt/chrome"),
		).toEqual([["/opt/chrome", ...HEADLESS_ARGS, URL]]);
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
