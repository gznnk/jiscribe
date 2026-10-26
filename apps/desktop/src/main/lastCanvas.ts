// Which canvas the window shows when none is on display: the one open at the
// app's last quit or Open…, or a scratch file of its own, tried in that order.
// The record of the former lives under Electron's userData directory, which is
// passed in rather than read here, so nothing in this file imports electron and
// vitest can load it.

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** The record, under the userData directory */
const LAST_CANVAS_RECORD_FILE_NAME = "lastCanvas.json";

/** The directory under userData holding the canvas opened when none is remembered */
const SCRATCH_CANVAS_DIRECTORY_NAME = "canvases";

const SCRATCH_CANVAS_FILE_NAME = "untitled.jis";

/** What lastCanvas.json holds: the canvas's absolute path */
type LastCanvasRecord = {
	path: string;
};

/**
 * The canvases to try at startup, in order. Never empty: the scratch canvas is
 * always the last, so trying them always ends on a canvas or a failure
 */
export type StartupCanvasCandidates = readonly [string, ...string[]];

/**
 * The part of a canvas host (jiscribe-mcp's `CanvasHost`) that names the file
 * on display
 */
type DisplayedCanvasHost = {
	/** The directory the host serves, as an absolute path */
	workspaceRoot: string;
	/** The file name relative to `workspaceRoot`, or null when none is set */
	getOpenPath: () => string | null;
};

const isLastCanvasRecord = (value: unknown): value is LastCanvasRecord =>
	typeof value === "object" &&
	value !== null &&
	typeof (value as { path?: unknown }).path === "string";

const isExistingPath = async (filePath: string): Promise<boolean> => {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
};

const isMissingFileError = (error: unknown): boolean =>
	(error as { code?: unknown } | null)?.code === "ENOENT";

/**
 * The canvas path the app last recorded, or null when there is no record or it
 * cannot be used. A record that exists but cannot be read or is not a
 * `{ "path": string }` object is reported on stderr, naming the file, and
 * counts as none; a missing record is the normal first start and is not.
 *
 * @param userDataDir Electron's userData directory, where the record is kept
 */
export const readLastCanvasPath = async (
	userDataDir: string,
): Promise<string | null> => {
	const recordPath = path.join(userDataDir, LAST_CANVAS_RECORD_FILE_NAME);
	let recordText: string;
	try {
		recordText = await readFile(recordPath, "utf8");
	} catch (error) {
		if (!isMissingFileError(error)) {
			console.error(`jiscribe-desktop: skipping ${recordPath}:`, error);
		}
		return null;
	}
	let parsedRecord: unknown;
	try {
		parsedRecord = JSON.parse(recordText);
	} catch {
		parsedRecord = undefined;
	}
	if (!isLastCanvasRecord(parsedRecord)) {
		console.error(
			`jiscribe-desktop: skipping ${recordPath}: not a {"path": string} JSON object`,
		);
		return null;
	}
	return parsedRecord.path;
};

/**
 * Record `canvasPath` as the canvas open at this quit or Open…, replacing the
 * previous record.
 *
 * @param userDataDir Electron's userData directory; created when missing
 * @param canvasPath The canvas as an absolute path
 */
export const writeLastCanvasPath = async (
	userDataDir: string,
	canvasPath: string,
): Promise<void> => {
	await mkdir(userDataDir, { recursive: true });
	const record: LastCanvasRecord = { path: canvasPath };
	await writeFile(
		path.join(userDataDir, LAST_CANVAS_RECORD_FILE_NAME),
		JSON.stringify(record),
	);
};

/**
 * The canvas the app opens when it remembers none: `canvases/untitled.jis` under
 * userData. Nothing is created here: openCanvas creates a missing canvas as an
 * empty one, its directory included.
 *
 * @param userDataDir Electron's userData directory
 */
export const getScratchCanvasPath = (userDataDir: string): string =>
	path.join(
		userDataDir,
		SCRATCH_CANVAS_DIRECTORY_NAME,
		SCRATCH_CANVAS_FILE_NAME,
	);

/**
 * The canvases to try opening when nothing is on display, in order: the last
 * one recorded if it still exists, then the scratch canvas. A recorded file
 * that is gone is reported on stderr and left out rather than created again
 * where it was.
 *
 * @param userDataDir Electron's userData directory
 * @returns One or two absolute paths; the scratch canvas is always the last
 */
export const listStartupCanvasCandidates = async (
	userDataDir: string,
): Promise<StartupCanvasCandidates> => {
	const scratchPath = getScratchCanvasPath(userDataDir);
	const lastPath = await readLastCanvasPath(userDataDir);
	if (lastPath === null || lastPath === scratchPath) {
		return [scratchPath];
	}
	if (!(await isExistingPath(lastPath))) {
		console.error(
			`jiscribe-desktop: skipping the remembered canvas ${lastPath}: it no longer exists`,
		);
		return [scratchPath];
	}
	return [lastPath, scratchPath];
};

/**
 * Try the candidates in order until one is on display. A candidate that fails
 * falls through to the next; the last failure is what the person is shown when
 * none is left.
 *
 * @param candidates The paths to try, first to last, as
 *   `listStartupCanvasCandidates` lists them
 * @param tryOpen Puts the canvas at the path on display, answering null, or
 *   answers why it could not; it is not called past the first success
 * @returns null once a candidate is on display; else the reason the last
 *   candidate failed
 */
export const tryOpenCanvasCandidates = async (
	[firstPath, ...otherPaths]: StartupCanvasCandidates,
	tryOpen: (canvasPath: string) => Promise<string | null>,
): Promise<string | null> => {
	let failure = await tryOpen(firstPath);
	for (const candidatePath of otherPaths) {
		if (failure === null) {
			break;
		}
		failure = await tryOpen(candidatePath);
	}
	return failure;
};

/**
 * The absolute path of the canvas `host` has on display, or null when none is
 * set. `getOpenPath` is the file name relative to `workspaceRoot` (the host
 * serves that one directory), so joining the two is the path.
 *
 * @param host The canvas host; `runtime.getHost()` once it is not null
 */
export const getDisplayedCanvasPath = (
	host: DisplayedCanvasHost,
): string | null => {
	const openPath = host.getOpenPath();
	return openPath === null ? null : path.join(host.workspaceRoot, openPath);
};
