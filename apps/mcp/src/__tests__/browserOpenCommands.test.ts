import { describe, expect, it } from "vitest";

import {
	calcBrowserOpenCommands,
	calcBrowserOpenPreference,
} from "../host/browserOpenCommands";

const URL = "http://localhost:5190";

describe("calcBrowserOpenCommands", () => {
	it("tab モードは既定ブラウザの候補だけを返す", () => {
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

	it("app モードは --app= を先に並べ、最後はタブへ落ちる", () => {
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

	it("app モードで実行ファイルを名指しすると、その 1 つだけを試してタブへ落ちる", () => {
		const commands = calcBrowserOpenCommands(URL, "linux", "app", "msedge.exe");
		expect(commands[0]).toEqual(["msedge.exe", `--app=${URL}`]);
		expect(commands[1]).toEqual(["xdg-open", URL]);
	});

	it("win32 の app モードは App Paths を通すため start に任せる", () => {
		expect(calcBrowserOpenCommands(URL, "win32", "app")[0]).toEqual([
			"cmd",
			"/c",
			"start",
			"",
			"chrome",
			`--app=${URL}`,
		]);
	});

	it("darwin の app モードは open -na で --args 以降を渡す", () => {
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
	it("未設定・空・app はアプリモード", () => {
		expect(calcBrowserOpenPreference(undefined)).toEqual({ mode: "app" });
		expect(calcBrowserOpenPreference("  ")).toEqual({ mode: "app" });
		expect(calcBrowserOpenPreference("app")).toEqual({ mode: "app" });
	});

	it("tab / default は既定ブラウザのタブ", () => {
		expect(calcBrowserOpenPreference("tab")).toEqual({ mode: "tab" });
		expect(calcBrowserOpenPreference("default")).toEqual({ mode: "tab" });
	});

	it("それ以外は app モードで使う実行ファイルの名指しとして読む", () => {
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
