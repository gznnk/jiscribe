import { fileURLToPath } from "node:url";

import type { Browser, BrowserType } from "playwright-core";
import { describe, expect, it, vi } from "vitest";

import { launchBrowser } from "../launchBrowser";

/** A file that certainly exists, for the "--browser is a path" cases. */
const REAL_FILE = fileURLToPath(import.meta.url);

/**
 * Stands in for playwright's chromium, recording what it was asked to launch and
 * failing for whatever the test says is not installed.
 */
const stubChromium = (
	canLaunch: (options: Record<string, unknown>) => boolean,
): { chromium: BrowserType; launches: Record<string, unknown>[] } => {
	const launches: Record<string, unknown>[] = [];
	const launch = vi.fn(async (options: Record<string, unknown>) => {
		launches.push(options);
		if (!canLaunch(options)) {
			throw new Error(`not installed\nmore detail on another line`);
		}
		return { close: vi.fn() } as unknown as Browser;
	});
	return { chromium: { launch } as unknown as BrowserType, launches };
};

describe("launchBrowser", () => {
	it("prefers the user's Chrome over everything else", async () => {
		const { chromium, launches } = stubChromium(
			(options) => options.channel === "chrome",
		);
		await expect(launchBrowser(chromium, null)).resolves.toMatchObject({
			description: "chrome (channel)",
		});
		expect(launches).toHaveLength(1);
	});

	it("falls back to Edge when Chrome is not installed", async () => {
		const { chromium, launches } = stubChromium(
			(options) => options.channel === "msedge",
		);
		await expect(launchBrowser(chromium, null)).resolves.toMatchObject({
			description: "msedge (channel)",
		});
		expect(launches.map((launch) => launch.channel)).toEqual([
			"chrome",
			"msedge",
		]);
	});

	it("falls back last to playwright's own Chromium, launched with no channel", async () => {
		const { chromium, launches } = stubChromium(
			(options) => options.channel === undefined,
		);
		await expect(launchBrowser(chromium, null)).resolves.toMatchObject({
			description: "playwright's bundled Chromium",
		});
		expect(launches).toHaveLength(3);
	});

	it("says what to install, and what it tried, when nothing can be launched", async () => {
		const { chromium } = stubChromium(() => false);
		await expect(launchBrowser(chromium, null)).rejects.toThrow(
			/needs a Chromium-based browser and found none/,
		);
		await expect(launchBrowser(chromium, null)).rejects.toThrow(
			/npx playwright install chromium/,
		);
		// One line per attempt, not the whole of playwright's multi-line message.
		await expect(launchBrowser(chromium, null)).rejects.toThrow(
			/chrome: not installed\n {2}msedge: not installed/,
		);
	});

	it("launches a named channel and does not search past it", async () => {
		const { chromium, launches } = stubChromium(
			(options) => options.channel === "msedge",
		);
		await expect(launchBrowser(chromium, "msedge")).resolves.toMatchObject({
			description: "msedge (channel)",
		});
		expect(launches).toHaveLength(1);
	});

	it("treats a value that names a file as an executable path", async () => {
		const { chromium, launches } = stubChromium(
			(options) => options.executablePath === REAL_FILE,
		);
		await expect(launchBrowser(chromium, REAL_FILE)).resolves.toMatchObject({
			description: REAL_FILE,
		});
		expect(launches[0]).toMatchObject({ executablePath: REAL_FILE });
	});

	it("reports a missing executable before trying to launch it", async () => {
		const { chromium, launches } = stubChromium(() => true);
		await expect(launchBrowser(chromium, "/no/such/browser")).rejects.toThrow(
			"--browser /no/such/browser: no such file",
		);
		expect(launches).toHaveLength(0);
	});

	it("does not fall back when the browser the user named fails", async () => {
		const { chromium } = stubChromium(() => false);
		await expect(launchBrowser(chromium, "chrome")).rejects.toThrow(
			/--browser chrome could not be launched/,
		);
	});

	it("passes the determinism flags on every launch", async () => {
		const { chromium, launches } = stubChromium(() => true);
		await launchBrowser(chromium, null);
		expect(launches[0].args).toEqual(
			expect.arrayContaining([
				"--font-render-hinting=none",
				"--force-color-profile=srgb",
			]),
		);
		expect(launches[0].headless).toBe(true);
	});
});
