import { existsSync } from "node:fs";
import { sep } from "node:path";

import type { Browser, BrowserType } from "playwright-core";

/**
 * Flags that take the variation out of a render. The raster comes out of an
 * `<img>` drawn onto a 2D canvas, so what is left to vary between runs is how
 * the browser puts glyphs on the page and whether a GPU touched them at all.
 *
 * They make a render repeatable on one machine. Two different machines can still
 * differ — a different Chromium build rasterizes text differently — which is why
 * the CLI compares bytes only against itself.
 */
const DETERMINISM_ARGS = [
	// Subpixel positioning and hinting both depend on the host's font settings.
	"--font-render-hinting=none",
	"--disable-font-subpixel-positioning",
	"--disable-lcd-text",
	// Colour management, so the encoded pixels do not follow the display profile.
	"--force-color-profile=srgb",
	// Software rasterization only: a GPU path would make the output depend on the
	// driver, and headless has nothing to gain from it here.
	"--disable-gpu",
	"--disable-dev-shm-usage",
];

/**
 * The Chromium builds to try, in order, when `--browser` names none. A channel is
 * a browser the user already installed; the last entry is playwright's own
 * download, which is present on a machine that has run `playwright install`.
 *
 * No browser is shipped with this CLI — one Chromium per platform is far larger
 * than everything else here put together.
 */
const CHANNEL_CANDIDATES = ["chrome", "msedge"] as const;

/** A launched browser, and how it was found, for the error and the log to name. */
export type LaunchedBrowser = {
	browser: Browser;
	/** Human-readable account of what was launched (`Chrome (channel)`, a path, …). */
	description: string;
};

/** Whether the value names a file on disk rather than a channel. */
const looksLikeExecutablePath = (value: string): boolean =>
	value.includes(sep) || value.includes("/") || existsSync(value);

const launchWithArgs = (
	chromium: BrowserType,
	options: Record<string, unknown>,
): Promise<Browser> =>
	chromium.launch({ headless: true, args: DETERMINISM_ARGS, ...options });

/**
 * Launches a Chromium to render in, trying what the user named and otherwise
 * what the machine has.
 *
 * @param chromium - playwright-core's chromium browser type, passed in so this module needs no import of it at load time
 * @param requested - A channel name (`chrome`, `msedge`, `chromium`), an executable path, or null to search
 * @returns The browser and a description of it
 * @throws When the request cannot be honoured, or when the search finds nothing — the message names every place that was tried and what to do about it
 */
export const launchBrowser = async (
	chromium: BrowserType,
	requested: string | null,
): Promise<LaunchedBrowser> => {
	if (requested !== null) {
		const isPath = looksLikeExecutablePath(requested);
		if (isPath && !existsSync(requested)) {
			throw new Error(`--browser ${requested}: no such file`);
		}
		try {
			const browser = await launchWithArgs(
				chromium,
				isPath ? { executablePath: requested } : { channel: requested },
			);
			return {
				browser,
				description: isPath ? requested : `${requested} (channel)`,
			};
		} catch (error) {
			throw new Error(
				`--browser ${requested} could not be launched: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	const attempts: string[] = [];
	for (const channel of CHANNEL_CANDIDATES) {
		try {
			const browser = await launchWithArgs(chromium, { channel });
			return { browser, description: `${channel} (channel)` };
		} catch (error) {
			attempts.push(
				`${channel}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
			);
		}
	}
	// playwright's own Chromium, for a machine that has run `playwright install`.
	// Last rather than first: a browser the user installed is the one their other
	// renders will have used.
	try {
		const browser = await launchWithArgs(chromium, {});
		return { browser, description: "playwright's bundled Chromium" };
	} catch (error) {
		attempts.push(
			`playwright chromium: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
		);
	}

	throw new Error(
		[
			"render needs a Chromium-based browser and found none.",
			"Install Google Chrome or Microsoft Edge, or run `npx playwright install chromium`,",
			"or point at one yourself: --browser <channel|path-to-executable>.",
			"Tried:",
			...attempts.map((attempt) => `  ${attempt}`),
		].join("\n"),
	);
};
