// The one file on display, and the two directions it moves in.
//
// The source of truth is the .jis in the workspace. An AI tool or another editor
// rewriting it is picked up by the watch and mirrored into the windows; a person's
// save comes back the other way through writeOpenFile, under the same per-file lock
// the tools take and naming the revision it replaces, so neither side lands on top
// of the other without noticing.
//
// The text last handed out is remembered so that our own write, read back by the
// watch a moment later, is recognised as already known and says nothing — reloading
// the canvas under the person who just saved it is what that would otherwise do.
//
// A write refused because the file has moved on promises the window the newer file,
// which it merges its edits onto. The watch cannot keep that promise alone — a
// change undone before it polls is never seen — so the refusal hands out what it
// read itself, and a file that holds the named revision again by the time it is
// looked at is written rather than refused.

import { createHash } from "node:crypto";
import { unwatchFile, watchFile } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { WriteOpenFileOutcome } from "./canvasHostTypes";
import { resolveWorkspacePathReal } from "./workspacePaths";
import {
	prepareAtomicWrite,
	readFileSnapshot,
	type FileSnapshot,
} from "../atomicWrite";
import { canvasParser } from "../canvasDefinitions";
import { formatParseResult } from "../canvasStore";
import { isErrnoWithCode } from "../nodeErrors";
import type { CanvasHostServerMessage } from "../shared/canvasHostProtocol";

/**
 * Interval at which the target file is watched. Polling, because inotify does not
 * always arrive on WSL or across a network file system. Only ever one file is
 * being watched, so the load at this interval is negligible
 */
const WATCH_INTERVAL_MS = 300;

/**
 * How long a person's write keeps looking at a file that will not hold still —
 * caught half written, or rewritten under the write with the text it already
 * held — before it settles on what it saw last, and how long it waits between
 * looks. The file's lock is held all the while, so the tools wait on it too
 */
const WRITE_SETTLE_TIMEOUT_MS = 500;
const WRITE_SETTLE_RETRY_MS = 25;

/**
 * The revision a text is handed out under, and has to be named by again when it is
 * written back.
 *
 * @param docText The text as the viewer was given it, or as it was just written
 * @returns The lowercase hex SHA-256 of the text's UTF-8 bytes
 */
const calcDocRevision = (docText: string): string =>
	createHash("sha256").update(docText, "utf8").digest("hex");

/**
 * Reads a file with the identity it was read under (see readFileSnapshot),
 * answering null for one that does not exist. Any other failure (no permission, a
 * directory) is thrown: a file that is there but cannot be read is not one to
 * write over.
 *
 * @param file The file to read (absolute path)
 */
const readSnapshotIfExists = async (
	file: string,
): Promise<FileSnapshot | null> => {
	try {
		return await readFileSnapshot(file);
	} catch (error) {
		if (isErrnoWithCode(error, "ENOENT")) {
			return null;
		}
		throw error;
	}
};

/**
 * Whether a text read from the file may be a writer caught part of the way
 * through: it does not even get past the syntax. A document that parses but breaks
 * the schema is finished and wrong, and waiting would not change it.
 *
 * @param text The text as read
 */
const isPossiblyHalfWritten = (text: string): boolean =>
	canvasParser.parse(text).kind === "syntax-error";

const waitMs = async (delayMs: number): Promise<void> => {
	await new Promise((resolve) => setTimeout(resolve, delayMs));
};

export type FileMirrorOptions = {
	/** What the paths on display are relative to (absolute path) */
	workspaceRoot: string;
	/** Sends one frame to every open window */
	broadcast: (message: CanvasHostServerMessage) => void;
	/**
	 * Runs one file's task with the tasks queued ahead of it for that file, so a
	 * write from the viewer and a rewrite from an AI tool never overlap
	 *
	 * @param filePath The file the task touches (absolute path)
	 * @param task What to run once the file is free
	 */
	withFileLock: <T>(filePath: string, task: () => Promise<T>) => Promise<T>;
	/**
	 * Asks the windows to write out the edits they are still holding, and waits.
	 * Called before the file on display changes, since a write is taken only for
	 * the file that is on display when it arrives
	 */
	flushEdits: () => Promise<void>;
};

export type FileMirror = {
	/** The file on display (relative to workspaceRoot), or null when none is set */
	getOpenPath: () => string | null;
	/**
	 * Puts a file on display: reads it, tells the windows, and watches it from then
	 * on. Calls are taken one at a time in the order they are made, and one
	 * overtaken by a newer call drops out rather than landing after it.
	 *
	 * @param relPath The file to show, relative to workspaceRoot. One that cannot
	 *   be read is still the file on display, with the reason sent to the windows
	 */
	openFile: (relPath: string) => Promise<void>;
	/**
	 * Takes in one write from the viewer: the file on display, at the revision the
	 * window that wrote it was last given.
	 *
	 * @param relPath The file to write, relative to workspaceRoot
	 * @param body The bytes to write; they are read as UTF-8 to be parsed and to
	 *   compute the revision
	 * @param ifMatch The revision this write replaces
	 * @returns What became of it. A path leading out of the workspace, or a write
	 *   that fails, is thrown rather than returned
	 */
	writeOpenFile: (
		relPath: string,
		body: Buffer,
		ifMatch: string,
	) => Promise<WriteOpenFileOutcome>;
	/**
	 * The frame that opens what is on display, for a window that has just connected.
	 *
	 * @returns null when no file is on display, or when the one on display could not
	 *   be read — there is nothing to open in either case
	 */
	calcOpenCanvasMessage: () => CanvasHostServerMessage | null;
	/** Stops watching, for a host that is being torn down */
	stopWatching: () => void;
};

/**
 * Creates the mirror between the file on display and the windows showing it.
 *
 * @param options Where the workspace is, how to reach the windows, and the gate
 *   every write goes through
 */
export const createFileMirror = (options: FileMirrorOptions): FileMirror => {
	const { workspaceRoot, broadcast, withFileLock } = options;

	// The file on display, and the text last handed out as its content
	let openPath: string | null = null;
	let lastKnownText: string | null = null;
	// The revision of lastKnownText, so that the two are never out of step. Set
	// through recordKnownText / clearKnownText alone
	let lastKnownRevision: string | null = null;
	let watchedFile: string | null = null;
	// Reads of the file are numbered as they start, and one is taken only while no
	// read started after it has been. Two reads in the air (the watch's and a
	// write's) can finish in either order, and the one to finish last did not
	// necessarily see the file last
	let readCount = 0;
	let takenReadNumber = 0;

	/** Numbers a read of the open file, just before it starts */
	const beginRead = (): number => {
		readCount += 1;
		return readCount;
	};

	/**
	 * Claims a read's result as the newest word on the file.
	 *
	 * @param readNumber What beginRead gave the read
	 * @returns false when a read started after it has already been taken, and what
	 *   it found is to be dropped
	 */
	const takeRead = (readNumber: number): boolean => {
		if (readNumber < takenReadNumber) {
			return false;
		}
		takenReadNumber = readNumber;
		return true;
	};

	/**
	 * Records the text the open file is now believed to hold.
	 *
	 * @param text The text as it was read or written
	 * @returns Its revision, which is what the viewer is given alongside it
	 */
	const recordKnownText = (text: string): string => {
		lastKnownText = text;
		lastKnownRevision = calcDocRevision(text);
		return lastKnownRevision;
	};

	/** Forgets the text, for a file that cannot be read at all */
	const clearKnownText = (): void => {
		lastKnownText = null;
		lastKnownRevision = null;
	};

	/**
	 * Passes a text read from the file on display on to the windows, unless they
	 * have it already or a newer read has spoken for the file since.
	 *
	 * @param readNumber What beginRead gave the read the text came from
	 */
	const passOnReadText = (
		relPath: string,
		readNumber: number,
		text: string,
	): void => {
		if (relPath !== openPath || !takeRead(readNumber)) {
			return;
		}
		if (text === lastKnownText) {
			return;
		}
		broadcast({
			type: "docChanged",
			relPath,
			docText: text,
			revision: recordKnownText(text),
		});
	};

	/**
	 * Reads the file on display. Returns null when it cannot be read, and tells the
	 * viewer why (the AI side hears it separately through the tool's return value,
	 * so nothing is thrown here).
	 */
	const readOpenFileText = async (relPath: string): Promise<string | null> => {
		try {
			return await readFile(path.resolve(workspaceRoot, relPath), "utf8");
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			broadcast({ type: "docError", relPath, message: reason });
			return null;
		}
	};

	const stopWatching = (): void => {
		if (watchedFile !== null) {
			unwatchFile(watchedFile);
			watchedFile = null;
		}
	};

	const startWatching = (relPath: string): void => {
		stopWatching();
		const absolutePath = path.resolve(workspaceRoot, relPath);
		watchedFile = absolutePath;
		watchFile(absolutePath, { interval: WATCH_INTERVAL_MS }, () => {
			void (async () => {
				// A firing right after a switch can still point at the old target
				if (openPath !== relPath) {
					return;
				}
				const readNumber = beginRead();
				const text = await readOpenFileText(relPath);
				if (text !== null) {
					passOnReadText(relPath, readNumber, text);
					return;
				}
				// The windows have just been told the file cannot be read, so the same
				// text coming back is news to them and has to be sent. Left alone if a
				// newer read or a person's write has spoken for the file meanwhile
				if (openPath === relPath && takeRead(readNumber)) {
					clearKnownText();
				}
			})();
		});
	};

	/**
	 * The openFile queued last, which the next call waits on. Without it two calls
	 * interleave over their reads, and the file on display ends up paired with the
	 * other one's text and watch
	 */
	let openFileChain: Promise<void> = Promise.resolve();

	/** How many openFile calls have been made, which names the newest of them */
	let openFileCallCount = 0;

	return {
		getOpenPath: () => openPath,
		openFile: (relPath) => {
			openFileCallCount += 1;
			const callNumber = openFileCallCount;
			// A call overtaken while it waited has nothing left to say: the file the
			// newer call names is the one to end up on display
			const isNewestCall = (): boolean => callNumber === openFileCallCount;
			const run = async (): Promise<void> => {
				if (!isNewestCall()) {
					return;
				}
				// The windows may still be holding a person's edits on the save debounce,
				// and the write those edits are about to go out as is refused once the
				// file on display has moved on (the file API takes a write only for that
				// file). So they are asked for while the old path is still the open one
				if (openPath !== null && openPath !== relPath) {
					await options.flushEdits();
					if (!isNewestCall()) {
						return;
					}
				}
				const text = await readOpenFileText(relPath);
				if (!isNewestCall()) {
					return;
				}
				// Only now is this the file on display: until here a write for the file
				// still showing is taken, and one for this file is not
				openPath = relPath;
				startWatching(relPath);
				// A read still in the air is of the file displayed until now, and is not
				// to be taken for this one
				takeRead(beginRead());
				if (text === null) {
					clearKnownText();
					return;
				}
				broadcast({
					type: "openCanvas",
					relPath,
					docText: text,
					revision: recordKnownText(text),
				});
			};
			const queued = openFileChain.then(run, run);
			openFileChain = queued.then(
				() => undefined,
				() => undefined,
			);
			return queued;
		},
		writeOpenFile: async (relPath, body, ifMatch) => {
			return await withFileLock(
				path.resolve(workspaceRoot, relPath),
				async (): Promise<WriteOpenFileOutcome> => {
					// Read again under the lock: the file on display may have moved on
					// while this write waited its turn
					if (relPath !== openPath) {
						return { kind: "not-open" };
					}
					// The tools re-parse before they write and so does this route: a
					// window must not be able to leave a file the tools refuse to load
					const writtenText = body.toString("utf8");
					const parsed = canvasParser.parse(writtenText);
					if (parsed.kind !== "ok") {
						return { kind: "invalid-doc", message: formatParseResult(parsed) };
					}
					const resolvedFile = await resolveWorkspacePathReal(
						workspaceRoot,
						relPath,
					);
					// The parent directory has already resolved inside the workspace, so it
					// is safe to create
					await mkdir(path.dirname(resolvedFile), { recursive: true });
					const settleDeadline = Date.now() + WRITE_SETTLE_TIMEOUT_MS;
					// Written out in full before the revision is looked at, so that only a
					// stat stands between the check and the rename
					let prepared = await prepareAtomicWrite(resolvedFile, body);
					try {
						for (;;) {
							const isLastLook = Date.now() >= settleDeadline;
							// What the file holds is read rather than taken from lastKnownText:
							// a tool's write is on disk before the watch (which polls) has told
							// anyone, and comparing against what was last handed out would let
							// this write land on top of it
							const readNumber = beginRead();
							const snapshot = await readSnapshotIfExists(resolvedFile);
							// A file that is gone holds nothing this write could overwrite, so
							// it is let through rather than refused over a revision there is
							// none of
							if (snapshot !== null) {
								const currentText = snapshot.contents.toString("utf8");
								const currentRevision = calcDocRevision(currentText);
								if (ifMatch !== currentRevision) {
									// Refused over a writer caught half way through, the window
									// would be sent that half, and nothing after it when the writer
									// finishes with the text the window already has
									if (!isLastLook && isPossiblyHalfWritten(currentText)) {
										await waitMs(WRITE_SETTLE_RETRY_MS);
										continue;
									}
									passOnReadText(relPath, readNumber, currentText);
									return {
										kind: "revision-mismatch",
										revision: currentRevision,
									};
								}
							}
							// Our lock does not hold back a writer outside this process, which
							// may have written the file since it was read. That write is kept,
							// and the file looked at again: it may hold what this write names
							// all the same (the same bytes written again, an editor saving
							// unchanged), and then there is nothing to refuse
							if (
								await prepared.commitIfUnchanged(snapshot?.identity ?? null)
							) {
								break;
							}
							if (isLastLook) {
								return { kind: "file-unsettled" };
							}
							await waitMs(WRITE_SETTLE_RETRY_MS);
							prepared = await prepareAtomicWrite(resolvedFile, body);
						}
					} finally {
						await prepared.abort();
					}
					// Recorded from the bytes that were written, so the watch reads its own
					// write back as something already known and says nothing. Numbered after
					// the rename, so a read that saw the file before it and finishes later
					// is not taken over this
					takeRead(beginRead());
					const revision = recordKnownText(writtenText);
					// Every window is told, the one that wrote included: it drops the echo
					// against the text it sent and takes the revision with it
					broadcast({
						type: "docChanged",
						relPath,
						docText: writtenText,
						revision,
					});
					return { kind: "written", revision };
				},
			);
		},
		calcOpenCanvasMessage: () => {
			if (
				openPath === null ||
				lastKnownText === null ||
				lastKnownRevision === null
			) {
				return null;
			}
			return {
				type: "openCanvas",
				relPath: openPath,
				docText: lastKnownText,
				revision: lastKnownRevision,
			};
		},
		stopWatching,
	};
};
