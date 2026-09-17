// Keeping the file and the drawn doc the same, in both directions.
//
// The file in the workspace is the source of truth: its text arrives from the host
// and is drawn, and a person's edits go back after a short pause. Two things keep
// one side from throwing away the other's work:
//
// - every write quotes the revision of the text it replaces, and the host refuses
//   it when the file has moved on since (a conflict is not retried — the newer
//   text is already on its way as a docChanged frame)
// - while the text that arrived cannot be parsed, saving is blocked. The doc on
//   screen is then older than the file, so writing it out would undo whatever is
//   being edited outside

import type { CanvasDoc } from "@jiscribe/canvas";
import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";

import { canvasParser } from "./canvasPlugins";
import { saveFile, type SaveFileResult } from "./files";

/**
 * How long to wait after the edits settle before writing out. Writing on every
 * single drag would let the AI catch a half-finished shape the moment it reads, so
 * they are buffered briefly first
 */
const SAVE_DEBOUNCE_MS = 500;

/** Put under the parse error while the text from the host cannot be read */
const BROKEN_FILE_NOTE =
	"ファイルが壊れています。読めるようになるまで、この画面の編集は保存されません";

/** Shown when the host refused the write because the file had moved on */
const SAVE_CONFLICT_MESSAGE =
	"他の編集で更新されたため、この変更は保存されませんでした";

const emptyDoc: CanvasDoc = { version: 1, root: [] };

/**
 * Formats it the same way the host's write-back does (canvasStore's
 * serializeCanvasFile)
 */
const serializeDoc = (doc: CanvasDoc): string =>
	`${JSON.stringify(doc, null, "\t")}\n`;

const formatParseError = (
	result: Exclude<ReturnType<typeof canvasParser.parse>, { kind: "ok" }>,
): string => {
	switch (result.kind) {
		case "syntax-error":
		case "internal-error":
			return result.message;
		case "structure-error":
		case "semantic-error":
			return result.diagnostics
				.map((diagnostic) => `${diagnostic.path}: ${diagnostic.message}`)
				.join("\n");
	}
};

export type DocSyncOptions = {
	/**
	 * The token the socket picked up on its last connect, read at write time
	 * rather than held, since a reconnect to a restarted host brings a new one.
	 * null stands for a page that has not reached the host yet
	 */
	sessionTokenRef: RefObject<string | null>;
	/** Puts a message in the error bar, or clears it with null */
	reportError: (message: string | null) => void;
};

export type DocSync = {
	/** The doc to draw. A new object on every incoming frame and every edit */
	doc: CanvasDoc;
	/** Workspace-relative path of the open file, null before one has arrived */
	openPath: string | null;
	/**
	 * Takes in an openCanvas or docChanged frame. Text equal to what the host is
	 * known to hold is this page's own write coming back: only the revision is
	 * taken from it, so that the canvas is not redrawn under the person's hands
	 */
	applyIncomingDoc: (
		relPath: string,
		docText: string,
		revision: string,
	) => void;
	/** Takes a committed edit and puts the write on the debounce */
	handleCommit: (committedDoc: CanvasDoc) => void;
	/**
	 * Writes the current doc out, the edits still sitting on the debounce taken
	 * along and behind whatever write is already on its way. False means the file
	 * does not hold these edits, and why is in the error bar — a failed write, a
	 * file that has moved on, a file too broken to parse, or none open at all
	 */
	flushPendingSave: () => Promise<boolean>;
};

/**
 * Holds the doc the canvas draws and keeps it and the file in step.
 *
 * @param options Where the session token is read from at write time, and where a
 *   failure goes on screen
 * @returns The doc and the open path to draw with, the way an incoming frame goes
 *   in, and the two ways a person's edits reach the file (on commit, flushed)
 */
export function useDocSync({
	sessionTokenRef,
	reportError,
}: DocSyncOptions): DocSync {
	const [doc, setDoc] = useState<CanvasDoc>(emptyDoc);
	const [openPath, setOpenPath] = useState<string | null>(null);

	const latestDocRef = useRef<CanvasDoc>(emptyDoc);
	const openPathRef = useRef<string | null>(null);
	// The last text known to be the same here as on the host. Kept so a save's echo
	// does not cause a redraw
	const syncedTextRef = useRef<string | null>(null);
	// The host's revision of that text, quoted by the next write
	const revisionRef = useRef<string | null>(null);
	// The error bar's text while the file cannot be parsed, null while it can. It
	// doubles as the block on saving: what is drawn is older than the file, and
	// writing it out would take the outside editor's work with it
	const brokenFileErrorRef = useRef<string | null>(null);
	const saveTimerRef = useRef<number | null>(null);
	// The write that is on its way, so that a second save queues behind it rather
	// than racing it, and so that closing or flushing can wait for it
	const inFlightSaveRef = useRef<Promise<boolean> | null>(null);

	const applyIncomingDoc = useCallback(
		(relPath: string, docText: string, revision: string): void => {
			if (docText === syncedTextRef.current) {
				// This page's own write coming back. The drawing is already this text;
				// all that is new is the revision the next write has to quote
				revisionRef.current = revision;
				return;
			}
			const result = canvasParser.parse(docText);
			if (result.kind !== "ok") {
				brokenFileErrorRef.current = `${formatParseError(result)}\n${BROKEN_FILE_NOTE}`;
				reportError(brokenFileErrorRef.current);
				return;
			}
			brokenFileErrorRef.current = null;
			syncedTextRef.current = docText;
			revisionRef.current = revision;
			openPathRef.current = relPath;
			latestDocRef.current = result.doc;
			setOpenPath(relPath);
			setDoc(result.doc);
			reportError(null);
		},
		[reportError],
	);

	/**
	 * Writes the current doc out, unless it is already what the host has. Only
	 * saveNow calls it, which is what keeps two writes from being in the air at once
	 */
	const writeCurrentDoc = useCallback(async (): Promise<boolean> => {
		const targetPath = openPathRef.current;
		const revision = revisionRef.current;
		// A revision comes with every doc frame, so having a path without one would
		// be the host breaking its own contract
		if (targetPath === null || revision === null) {
			return false;
		}
		if (brokenFileErrorRef.current !== null) {
			reportError(brokenFileErrorRef.current);
			return false;
		}
		const text = serializeDoc(latestDocRef.current);
		if (text === syncedTextRef.current) {
			return true;
		}
		// Record it before saving, so that if the host's watch picks this write up and
		// sends it back, it can be rejected on the match
		const previousSyncedText = syncedTextRef.current;
		syncedTextRef.current = text;
		// Puts back what the host is known to hold after a write that did not land,
		// so that saving the same edits again is not mistaken for a no-op. A frame
		// that arrived while the write was out has recorded something newer already,
		// and that is left alone
		const restoreSyncedText = (): void => {
			if (syncedTextRef.current === text) {
				syncedTextRef.current = previousSyncedText;
			}
		};
		let result: SaveFileResult;
		try {
			result = await saveFile(
				targetPath,
				text,
				sessionTokenRef.current,
				revision,
			);
		} catch (error) {
			restoreSyncedText();
			reportError(`保存に失敗しました: ${String(error)}`);
			return false;
		}
		if (result.kind === "conflict") {
			// The newer document arrives as a docChanged frame, which redraws the
			// canvas with it; writing again here is how the other edit would be lost.
			// The revision is left as it was, since it belongs with the text put back
			restoreSyncedText();
			reportError(SAVE_CONFLICT_MESSAGE);
			return false;
		}
		// Only while this write is still what the host is believed to hold: a frame
		// that landed in the meantime brought the revision belonging to its own text
		if (syncedTextRef.current === text) {
			revisionRef.current = result.revision;
		}
		reportError(null);
		return true;
	}, [reportError, sessionTokenRef]);

	const saveNow = useCallback(async (): Promise<boolean> => {
		const precedingSave = inFlightSaveRef.current;
		const running = (async (): Promise<boolean> => {
			// A write started while another is in flight would race it, and the file
			// would end up holding whichever answer the host happened to take last.
			// How that one ended is its own caller's business: failing along with it
			// would spread one failure over every save that follows
			await precedingSave?.catch(() => false);
			return await writeCurrentDoc();
		})();
		inFlightSaveRef.current = running;
		try {
			return await running;
		} finally {
			// Only while this is still the newest write: a save that queued behind it
			// is what the next one has to wait for
			if (inFlightSaveRef.current === running) {
				inFlightSaveRef.current = null;
			}
		}
	}, [writeCurrentDoc]);

	const flushPendingSave = useCallback(async (): Promise<boolean> => {
		if (saveTimerRef.current !== null) {
			window.clearTimeout(saveTimerRef.current);
			saveTimerRef.current = null;
		}
		return await saveNow();
	}, [saveNow]);

	const handleCommit = useCallback(
		(committedDoc: CanvasDoc): void => {
			latestDocRef.current = committedDoc;
			setDoc(committedDoc);
			if (saveTimerRef.current !== null) {
				window.clearTimeout(saveTimerRef.current);
			}
			saveTimerRef.current = window.setTimeout(() => {
				saveTimerRef.current = null;
				void saveNow();
			}, SAVE_DEBOUNCE_MS);
		},
		[saveNow],
	);

	return {
		doc,
		openPath,
		applyIncomingDoc,
		handleCommit,
		flushPendingSave,
	};
}
