import { describe, expect, it } from "vitest";

import {
	calcBrowserOpenCommands,
	calcBrowserOpenPreference,
} from "../host/browserOpenCommands";

const URL = "http://localhost:5190";

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
