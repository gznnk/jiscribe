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
// - the file coming back to the text last synced after the page was told it could
//   not be used (broken, unreadable, gone) is a recovery and not an echo: the error
//   goes, and the edits made meanwhile — on that very text — are written out
// - edits the file does not hold yet are remembered as such until a write carrying
//   them lands. A write that failed on the way (no answer, a 5xx) is sent again on
//   a backoff and at once when the connection comes back; a newer file drawn over
//   them is said so in the error bar rather than taking them silently
//
// And an edit is written to the document it was made on and to no other. The doc
// waiting to be written is kept together with the document it belongs to, and an
// edit the canvas hands over after another document has come in is refused rather
// than written into that one

import type { CanvasDoc } from "@jiscribe/canvas";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

import { canvasParser } from "./canvasPlugins";
import { saveFile, type SaveFileResult } from "./files";
import { classifyIncomingDoc, isSameDoc, type DocIdentity } from "./ownEcho";

/**
 * How long to wait after the edits settle before writing out. Writing on every
 * single drag would let the AI catch a half-finished shape the moment it reads, so
 * they are buffered briefly first
 */
const SAVE_DEBOUNCE_MS = 500;

/** Put under the parse error while the text from the host cannot be read */
const BROKEN_FILE_NOTE =
	"ファイルが壊れています。読めるようになるまで、この画面の編集は保存されません";

/**
 * Shown when a readable file replaced edits made while it was broken. They could
 * not be saved then, and the file has since moved on from the text they were made on
 */
const BROKEN_FILE_EDITS_LOST_MESSAGE =
	"ファイルが外で書き直されたため、壊れていた間の変更は保存されませんでした";

/**
 * The first wait before a write that failed on the way is sent again, doubled on
 * every failure after it up to the most
 */
const SAVE_RETRY_BASE_DELAY_MS = 1_000;
const SAVE_RETRY_MAX_DELAY_MS = 10_000;

/**
 * The error bar's text for a write that did not land.
 *
 * @param message What the network or the host said
 * @param isRetrying Whether the write is to be sent again; said so, since the
 *   edit is still on screen and a person has to know whether to redo it
 */
const formatSaveFailedMessage = (
	message: string,
	isRetrying: boolean,
): string =>
	isRetrying
		? `保存に失敗しました。つながりしだい保存し直します: ${message}`
		: `保存に失敗しました: ${message}`;

/**
 * Shown when a newer file for the same document is drawn over edits the host
 * never took
 */
const UNSAVED_EDITS_OVERWRITTEN_MESSAGE =
	"保存できていなかった変更は、ファイルが他で更新されたため取り消されました";

/** Shown when the host refused the write because the file had moved on */
const SAVE_CONFLICT_MESSAGE =
	"他の編集で更新されたため、この変更は保存されませんでした";

/**
 * Shown for an edit made on a document that is no longer the one on display. The
 * host takes writes for that one only, so the edit has nowhere left to go
 */
const formatLostEditMessage = (relPath: string): string =>
	`${relPath}: 別のファイルに切り替わったため、直前の変更は保存されませんでした`;

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
	/** Puts a message in the error bar, or clears it with null */
	reportError: (message: string | null) => void;
};

export type DocSync = {
	/** The doc to draw. A new object on every incoming frame and every edit */
	doc: CanvasDoc;
	/**
	 * The document drawn — its file and the host it came from — null before one has
	 * arrived. Writes go back to that host alone, under its token
	 */
	openDoc: DocIdentity | null;
	/**
	 * Takes in an openCanvas or docChanged frame. Text equal to what the host is
	 * known to hold for the same document is this page's own write coming back:
	 * only the revision is taken from it, so that the canvas is not redrawn under
	 * the person's hands. After the file was broken or could not be read, the same
	 * text is the file recovering instead: the error is cleared, and edits made
	 * meanwhile are written out
	 */
	applyIncomingDoc: (
		identity: DocIdentity,
		docText: string,
		revision: string,
	) => void;
	/**
	 * Takes in a docError frame: the host could not read the file. Shown in the
	 * error bar, and for the document drawn, remembered until the file is back
	 */
	applyDocError: (identity: DocIdentity, message: string) => void;
	/**
	 * Takes a committed edit and puts the write on the debounce. An edit made on a
	 * document that has since been replaced is dropped, and said so in the error bar
	 */
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
 * @param options Where a failure goes on screen
 * @returns The doc and the document it belongs to, to draw with, the way an incoming frame goes
 *   in, and the two ways a person's edits reach the file (on commit, flushed)
 */
export function useDocSync({ reportError }: DocSyncOptions): DocSync {
	const [doc, setDoc] = useState<CanvasDoc>(emptyDoc);
	const [openDoc, setOpenDoc] = useState<DocIdentity | null>(null);

	// The doc to write out, together with the document it belongs to. Read as one,
	// so that a write can only ever send a document's own doc to it
	const latestDocRef = useRef<{ identity: DocIdentity; doc: CanvasDoc } | null>(
		null,
	);
	// The last text known to be the same here as on the host. Kept so a save's echo
	// does not cause a redraw
	const syncedTextRef = useRef<string | null>(null);
	// The host's revision of that text, quoted by the next write
	const revisionRef = useRef<string | null>(null);
	// The error bar's text while the file cannot be parsed, null while it can. It
	// doubles as the block on saving: what is drawn is older than the file, and
	// writing it out would take the outside editor's work with it
	const brokenFileErrorRef = useRef<string | null>(null);
	// Set while the host cannot read the file drawn (gone, no permission). Saving
	// is not blocked — writing recreates the file, and there is nothing outside to
	// overwrite — but the synced text coming back is then a recovery, not an echo
	const isFileMissingRef = useRef(false);
	const saveTimerRef = useRef<number | null>(null);
	// The write that is on its way, so that a second save queues behind it rather
	// than racing it, and so that closing or flushing can wait for it
	const inFlightSaveRef = useRef<Promise<boolean> | null>(null);
	// Set when the host refused a write over a newer file. The frame carrying that
	// newer text follows within the watch interval and would clear the error bar,
	// taking the one explanation of why the edit vanished with it; so that frame
	// leaves the message up and only the next one clears it
	const hasUnexplainedConflictRef = useRef(false);
	// Set from the first edit the host does not hold yet until a write carrying all
	// of them lands, whether or not a save is scheduled. baseText is the text the
	// host held when they were made, which is what a newer file drawn over them has
	// to be told apart from (and a merge would start from)
	const unsavedEditsRef = useRef<{ baseText: string } | null>(null);
	// Set while the last write failed on the way and is owed again. It is what makes
	// the frame a reconnect brings for the same text a recovery rather than an echo
	const hasUndeliveredEditsRef = useRef(false);
	const saveRetryTimerRef = useRef<number | null>(null);
	const saveRetryDelayMsRef = useRef(SAVE_RETRY_BASE_DELAY_MS);
	// The retry goes through this rather than saveNow itself, which is what
	// schedules it
	const saveNowRef = useRef<(() => Promise<boolean>) | null>(null);

	// The document the canvas's commits are made on. It trails openDoc: the canvas
	// takes a new document up in an effect of the render that hands it over, so a
	// commit it delivers until then is still on the one before. This follows in the
	// render after — the canvas's own update was queued ahead of it by that effect
	// (a child's effects run before its parent's), so the render that brings this
	// state brings the canvas's new document too — and the ref moves in a layout
	// effect, as the canvas's mirror of its own state does, so the two agree for a
	// commit handed over at any moment
	const [committedOnDoc, setCommittedOnDoc] = useState<DocIdentity | null>(
		null,
	);
	const committedOnDocRef = useRef<DocIdentity | null>(null);
	useEffect(() => {
		setCommittedOnDoc((previous) =>
			isSameDoc(previous, openDoc) ? previous : openDoc,
		);
	}, [openDoc]);
	useLayoutEffect(() => {
		committedOnDocRef.current = committedOnDoc;
	}, [committedOnDoc]);

	/**
	 * Writes the current doc out, unless it is already what the host has. Only
	 * saveNow calls it, which is what keeps two writes from being in the air at once
	 */
	const writeCurrentDoc = useCallback(async (): Promise<boolean> => {
		// Written back to the host the doc came from, under that host's token: a
		// page that has reconnected to another host holds a token for that one before
		// that host's document has arrived, and quoting it would land this doc in a
		// file of the same name there
		const latestDoc = latestDocRef.current;
		if (latestDoc === null) {
			return false;
		}
		// Whatever brought this write about, a retry waiting on the clock is it
		if (saveRetryTimerRef.current !== null) {
			window.clearTimeout(saveRetryTimerRef.current);
			saveRetryTimerRef.current = null;
		}
		const targetDoc = latestDoc.identity;
		const revision = revisionRef.current;
		if (revision === null) {
			// Both are set from the same frame, so this cannot be reached through the
			// host's protocol
			throw new Error(`no revision is known for ${targetDoc.relPath}`);
		}
		if (brokenFileErrorRef.current !== null) {
			reportError(brokenFileErrorRef.current);
			return false;
		}
		const text = serializeDoc(latestDoc.doc);
		if (text === syncedTextRef.current) {
			// Edited back to what the host holds: nothing is owed any longer
			unsavedEditsRef.current = null;
			hasUndeliveredEditsRef.current = false;
			saveRetryDelayMsRef.current = SAVE_RETRY_BASE_DELAY_MS;
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
				targetDoc.relPath,
				text,
				targetDoc.sessionToken,
				revision,
			);
		} catch (error) {
			restoreSyncedText();
			hasUndeliveredEditsRef.current = false;
			reportError(formatSaveFailedMessage(String(error), false));
			return false;
		}
		if (result.kind === "failed") {
			restoreSyncedText();
			// Sent again only while the edits are still those of the document drawn;
			// a document drawn meanwhile has already said what became of them
			const isRetrying =
				result.isTransient &&
				isSameDoc(latestDocRef.current?.identity ?? null, targetDoc);
			hasUndeliveredEditsRef.current = isRetrying;
			reportError(formatSaveFailedMessage(result.message, isRetrying));
			return false;
		}
		hasUndeliveredEditsRef.current = false;
		saveRetryDelayMsRef.current = SAVE_RETRY_BASE_DELAY_MS;
		if (result.kind === "conflict") {
			// The newer document arrives as a docChanged frame, which redraws the
			// canvas with it; writing again here is how the other edit would be lost.
			// The revision is left as it was, since it belongs with the text put back
			restoreSyncedText();
			hasUnexplainedConflictRef.current = true;
			reportError(SAVE_CONFLICT_MESSAGE);
			return false;
		}
		// Only while this write is still what the host is believed to hold: a frame
		// that landed in the meantime brought the revision belonging to its own text
		if (syncedTextRef.current === text) {
			revisionRef.current = result.revision;
		}
		// Edits committed while the write was out are the ones still owed, and they
		// were made on top of what it wrote
		const currentDoc = latestDocRef.current;
		if (
			currentDoc !== null &&
			isSameDoc(currentDoc.identity, targetDoc) &&
			serializeDoc(currentDoc.doc) !== text
		) {
			unsavedEditsRef.current = { baseText: text };
		} else {
			unsavedEditsRef.current = null;
		}
		// The host has the file again, written from this page
		isFileMissingRef.current = false;
		hasUnexplainedConflictRef.current = false;
		reportError(null);
		return true;
	}, [reportError]);

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
			// is what the next one has to wait for, and it decides on a retry itself
			if (inFlightSaveRef.current === running) {
				inFlightSaveRef.current = null;
				if (
					hasUndeliveredEditsRef.current &&
					saveRetryTimerRef.current === null
				) {
					const retryDelayMs = saveRetryDelayMsRef.current;
					saveRetryDelayMsRef.current = Math.min(
						retryDelayMs * 2,
						SAVE_RETRY_MAX_DELAY_MS,
					);
					saveRetryTimerRef.current = window.setTimeout(() => {
						saveRetryTimerRef.current = null;
						void saveNowRef.current?.();
					}, retryDelayMs);
				}
			}
		}
	}, [writeCurrentDoc]);
	useEffect(() => {
		saveNowRef.current = saveNow;
	}, [saveNow]);

	const flushPendingSave = useCallback(async (): Promise<boolean> => {
		if (saveTimerRef.current !== null) {
			window.clearTimeout(saveTimerRef.current);
			saveTimerRef.current = null;
		}
		return await saveNow();
	}, [saveNow]);

	const applyIncomingDoc = useCallback(
		(identity: DocIdentity, docText: string, revision: string): void => {
			const wasFileBroken = brokenFileErrorRef.current !== null;
			const incomingKind = classifyIncomingDoc(
				{ identity, docText },
				{
					identity: latestDocRef.current?.identity ?? null,
					syncedText: syncedTextRef.current,
					isFileUnusable: wasFileBroken || isFileMissingRef.current,
					hasUndeliveredEdits: hasUndeliveredEditsRef.current,
				},
			);
			if (incomingKind === "echo") {
				// The drawing is already this text; all that is new is the revision the
				// next write has to quote. The host holding the whole drawing also settles
				// what the write's own answer, still on its way, would have
				revisionRef.current = revision;
				if (
					latestDocRef.current !== null &&
					serializeDoc(latestDocRef.current.doc) === docText
				) {
					unsavedEditsRef.current = null;
				}
				return;
			}
			if (incomingKind === "back-to-synced") {
				// The drawing is still this text plus whatever was edited while the file
				// could not be used or could not be reached. Those edits were made on this
				// very text, so writing them now overwrites nothing from outside
				revisionRef.current = revision;
				brokenFileErrorRef.current = null;
				isFileMissingRef.current = false;
				hasUnexplainedConflictRef.current = false;
				saveRetryDelayMsRef.current = SAVE_RETRY_BASE_DELAY_MS;
				reportError(null);
				void flushPendingSave();
				return;
			}
			const result = canvasParser.parse(docText);
			if (result.kind !== "ok") {
				brokenFileErrorRef.current = `${formatParseError(result)}\n${BROKEN_FILE_NOTE}`;
				isFileMissingRef.current = false;
				reportError(brokenFileErrorRef.current);
				return;
			}
			brokenFileErrorRef.current = null;
			isFileMissingRef.current = false;
			// Edits still on the debounce, or not yet taken by the host, belong to the
			// document being replaced, and the host no longer takes writes for it
			const previousDoc = latestDocRef.current?.identity ?? null;
			const isSameDocument = isSameDoc(previousDoc, identity);
			const pendingSaveTimer = saveTimerRef.current;
			const hasLostEdit =
				!isSameDocument &&
				(pendingSaveTimer !== null || unsavedEditsRef.current !== null);
			if (hasLostEdit && pendingSaveTimer !== null) {
				window.clearTimeout(pendingSaveTimer);
				saveTimerRef.current = null;
			}
			// Drawn over edits the host never took, for the same document. Edits undone
			// back to the text they were made on are nothing to lose
			const unsavedEdits = unsavedEditsRef.current;
			const hasOverwrittenUnsavedEdits =
				isSameDocument &&
				unsavedEdits !== null &&
				latestDocRef.current !== null &&
				serializeDoc(latestDocRef.current.doc) !== unsavedEdits.baseText;
			// Whatever was owed is now drawn over, so there is nothing left to send
			unsavedEditsRef.current = null;
			hasUndeliveredEditsRef.current = false;
			saveRetryDelayMsRef.current = SAVE_RETRY_BASE_DELAY_MS;
			if (saveRetryTimerRef.current !== null) {
				window.clearTimeout(saveRetryTimerRef.current);
				saveRetryTimerRef.current = null;
			}
			// Edits the broken file kept from being saved, now drawn over by a file
			// that has moved on from the text they were made on
			const hasLostBrokenFileEdit =
				wasFileBroken &&
				latestDocRef.current !== null &&
				isSameDocument &&
				serializeDoc(latestDocRef.current.doc) !== syncedTextRef.current;
			syncedTextRef.current = docText;
			revisionRef.current = revision;
			latestDocRef.current = { identity, doc: result.doc };
			setOpenDoc(identity);
			setDoc(result.doc);
			if (hasLostEdit && previousDoc !== null) {
				hasUnexplainedConflictRef.current = false;
				reportError(formatLostEditMessage(previousDoc.relPath));
				return;
			}
			if (hasLostBrokenFileEdit) {
				hasUnexplainedConflictRef.current = false;
				reportError(BROKEN_FILE_EDITS_LOST_MESSAGE);
				return;
			}
			if (hasUnexplainedConflictRef.current) {
				hasUnexplainedConflictRef.current = false;
				return;
			}
			if (hasOverwrittenUnsavedEdits) {
				reportError(UNSAVED_EDITS_OVERWRITTEN_MESSAGE);
				return;
			}
			reportError(null);
		},
		[flushPendingSave, reportError],
	);

	const applyDocError = useCallback(
		(identity: DocIdentity, message: string): void => {
			// An error about another file (one the host was switched to and could not
			// read) says nothing about the text this page synced
			if (isSameDoc(identity, latestDocRef.current?.identity ?? null)) {
				isFileMissingRef.current = true;
			}
			reportError(`${identity.relPath}: ${message}`);
		},
		[reportError],
	);

	const handleCommit = useCallback(
		(committedDoc: CanvasDoc): void => {
			const committedOn = committedOnDocRef.current;
			const latestDoc = latestDocRef.current;
			if (latestDoc === null || !isSameDoc(committedOn, latestDoc.identity)) {
				// Made on the document drawn before. Written out, it would land in the
				// one now open, and drawn, it would put the old objects on its canvas.
				// An edit made before any document arrived has no file to be lost from
				if (committedOn !== null) {
					reportError(formatLostEditMessage(committedOn.relPath));
				}
				return;
			}
			latestDocRef.current = {
				identity: latestDoc.identity,
				doc: committedDoc,
			};
			if (unsavedEditsRef.current === null && syncedTextRef.current !== null) {
				unsavedEditsRef.current = { baseText: syncedTextRef.current };
			}
			setDoc(committedDoc);
			if (saveTimerRef.current !== null) {
				window.clearTimeout(saveTimerRef.current);
			}
			saveTimerRef.current = window.setTimeout(() => {
				saveTimerRef.current = null;
				void saveNow();
			}, SAVE_DEBOUNCE_MS);
		},
		[reportError, saveNow],
	);

	return {
		doc,
		openDoc,
		applyIncomingDoc,
		applyDocError,
		handleCommit,
		flushPendingSave,
	};
}
