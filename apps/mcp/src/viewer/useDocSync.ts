// Keeping the file and the drawn doc the same, in both directions.
//
// The file in the workspace is the source of truth: its text arrives from the host
// and is drawn, and a person's edits go back after a short pause. Two things keep
// one side from throwing away the other's work:
//
// - every write quotes the revision of the text it replaces, and the host refuses
//   it when the file has moved on since (a conflict is not retried as it is — the
//   newer text is already on its way as a docChanged frame, and the edits are
//   merged onto that)
// - a newer file for the document drawn does not replace edits it does not hold
//   yet: they are merged onto it, object by object (./mergeCanvasDocs), and the
//   result is drawn and written. Where both changed the same object the file wins,
//   and the error bar names what of the person's was dropped
// - while the person has something in hand — a drag, a resize, text being typed —
//   a newer file is held back rather than drawn, since drawing it would cut that
//   off; it is taken in, merged with what the person committed, once they let go
// - while the text that arrived cannot be parsed, saving is blocked. The doc on
//   screen is then older than the file, so writing it out would undo whatever is
//   being edited outside
// - the file coming back to the text last synced after the page was told it could
//   not be used (broken, unreadable, gone) is a recovery and not an echo: the error
//   goes, and the edits made meanwhile — on that very text — are written out
// - edits the file does not hold yet are remembered as such until a write carrying
//   them lands. A write that failed on the way (no answer, a 5xx) is sent again on
//   a backoff and at once when the connection comes back
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

import { waitForCanvasFrames } from "./canvasFrames";
import { canvasParser } from "./canvasPlugins";
import { saveFile, type SaveFileResult } from "./files";
import {
	isSameJsonValue,
	mergeCanvasDocs,
	type CanvasMergeConflict,
} from "./mergeCanvasDocs";
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
 * How often a file held back behind the person's gesture checks whether the
 * gesture has ended. The canvas says what the person is doing when asked but has
 * nothing to call when it changes, so it is asked
 */
const HELD_DOC_POLL_MS = 100;

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
 * never took, because they could not be merged onto it at all (the merged doc did
 * not parse — a connector attached to an object the other side deleted)
 */
const UNSAVED_EDITS_OVERWRITTEN_MESSAGE =
	"保存できていなかった変更は、ファイルが他で更新されたため取り消されました";

/** Names one dropped change for the error bar: the object's id, or the field's key */
const describeMergeConflict = (conflict: CanvasMergeConflict): string => {
	switch (conflict.kind) {
		case "object":
		case "placement":
			return conflict.id;
		case "order":
			return conflict.id === null ? "重なり順" : `${conflict.id} の重なり順`;
		case "field":
			return conflict.key;
	}
};

/**
 * The error bar's text for the person's changes a merge dropped, because the file
 * had changed the same things another way.
 *
 * @param conflicts What was dropped, as the merge names it; at least one
 */
const formatMergeConflictMessage = (
	conflicts: readonly CanvasMergeConflict[],
): string =>
	`他の編集で更新されたため、次の変更は保存されませんでした: ${conflicts.map(describeMergeConflict).join("、")}`;

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

/**
 * How the person's unsaved edits went onto a newer file: merged (conflicts naming
 * what was dropped), or not at all
 */
type UnsavedEditsMerge =
	| { kind: "merged"; doc: CanvasDoc; conflicts: CanvasMergeConflict[] }
	| { kind: "failed" };

/**
 * Merges the edits on screen onto a newer file for the same document.
 *
 * @param baseText The text the edits were made on (unsavedEditsRef's baseText)
 * @param mineDoc The doc on screen, the edits in it
 * @param theirsDoc The newer file, parsed
 * @returns The merged doc, parsed again so that the canvas is handed nothing the
 *   parser has not passed; failed when the base or the merge does not parse
 */
const mergeUnsavedEdits = (
	baseText: string,
	mineDoc: CanvasDoc,
	theirsDoc: CanvasDoc,
): UnsavedEditsMerge => {
	const baseResult = canvasParser.parse(baseText);
	if (baseResult.kind !== "ok") {
		return { kind: "failed" };
	}
	const { doc, conflicts } = mergeCanvasDocs({
		base: baseResult.doc,
		mine: mineDoc,
		theirs: theirsDoc,
	});
	if (doc === theirsDoc) {
		return { kind: "merged", doc, conflicts };
	}
	const mergedResult = canvasParser.parse(serializeDoc(doc));
	return mergedResult.kind === "ok"
		? { kind: "merged", doc: mergedResult.doc, conflicts }
		: { kind: "failed" };
};

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
	/**
	 * Whether the person has something in hand that drawing a new doc would cut off
	 * (the canvas handle's `interaction.getStatus().isBusy`). Read on every frame
	 * and while one is held back, so a fresh function each render is fine
	 */
	isPersonInteracting: () => boolean;
};

/** A doc frame as it arrived, kept until it can be taken in */
type DocFrame = { identity: DocIdentity; docText: string; revision: string };

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
	 * meanwhile are written out. Newer text for the same document is held back
	 * while the person is in the middle of something, and merged with the edits the
	 * file does not hold yet when it is drawn
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
	 * file that has moved on, a file too broken to parse, or none open at all — or,
	 * with nothing in the error bar, that a newer file is held back behind the
	 * person's gesture and the edits go out merged onto it once that ends.
	 *
	 * @param options.isLeavingDocument Whether the page is about to leave this
	 *   document (another file opening, the window closing). A newer file held back
	 *   is then taken in and merged at once, the gesture going with it, since after
	 *   this the host takes no writes for it
	 */
	flushPendingSave: (options?: {
		isLeavingDocument?: boolean;
	}) => Promise<boolean>;
};

/**
 * Holds the doc the canvas draws and keeps it and the file in step.
 *
 * @param options Where a failure goes on screen
 * @returns The doc and the document it belongs to, to draw with, the way an incoming frame goes
 *   in, and the two ways a person's edits reach the file (on commit, flushed)
 */
export function useDocSync({
	reportError,
	isPersonInteracting,
}: DocSyncOptions): DocSync {
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
	// What a merge dropped, said in the error bar. The merge's own write clears the
	// bar when it lands, so this is what it says instead, until the person's next
	// edit
	const mergeConflictMessageRef = useRef<string | null>(null);
	// A newer file for the document drawn, held back while the person has something
	// in hand, and the timer watching for them to let go
	const heldFrameRef = useRef<DocFrame | null>(null);
	const heldFrameTimerRef = useRef<number | null>(null);
	const isPersonInteractingRef = useRef(isPersonInteracting);
	useEffect(() => {
		isPersonInteractingRef.current = isPersonInteracting;
	});
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
	// The watch goes through this, for the same reason
	const takeInHeldFrameRef = useRef<(() => void) | null>(null);

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
		// The file has moved on to the one held back, so this write would only be
		// refused; the edits go out merged onto it once it is taken in
		if (
			heldFrameRef.current !== null &&
			isSameDoc(heldFrameRef.current.identity, targetDoc)
		) {
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
			// The newer document arrives as a docChanged frame, and these edits, still
			// owed, are merged onto it then; writing them again as they are is how the
			// other edit would be lost. The revision is left as it was, since it
			// belongs with the text put back
			restoreSyncedText();
			return false;
		}
		// Only while this write is still what the host is believed to hold: a frame
		// that landed in the meantime brought the revision belonging to its own text,
		// and has settled what is owed on top of it
		if (syncedTextRef.current === text) {
			revisionRef.current = result.revision;
			// Edits committed while the write was out are the ones still owed, and
			// they were made on top of what it wrote
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
		}
		// The host has the file again, written from this page
		isFileMissingRef.current = false;
		reportError(mergeConflictMessageRef.current);
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

	/** Writes out now what is on the debounce, behind any write already out */
	const saveWithoutDebounce = useCallback(async (): Promise<boolean> => {
		if (saveTimerRef.current !== null) {
			window.clearTimeout(saveTimerRef.current);
			saveTimerRef.current = null;
		}
		return await saveNow();
	}, [saveNow]);

	/** Draws a doc frame, or settles what it says without drawing (an echo, a recovery) */
	const takeInDoc = useCallback(
		({ identity, docText, revision }: DocFrame): void => {
			const incomingKind = classifyIncomingDoc(
				{ identity, docText },
				{
					identity: latestDocRef.current?.identity ?? null,
					syncedText: syncedTextRef.current,
					isFileUnusable:
						brokenFileErrorRef.current !== null || isFileMissingRef.current,
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
				saveRetryDelayMsRef.current = SAVE_RETRY_BASE_DELAY_MS;
				reportError(null);
				void saveWithoutDebounce();
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
			const previousDoc = latestDocRef.current?.identity ?? null;
			const isSameDocument = isSameDoc(previousDoc, identity);
			// Edits still on the debounce, or not yet taken by the host, belong to the
			// document being replaced, and the host no longer takes writes for it
			const hasLostEdit =
				!isSameDocument &&
				(saveTimerRef.current !== null || unsavedEditsRef.current !== null);
			// On the same document they go onto the newer file instead, and whatever
			// comes of that is written below rather than on the debounce
			if (saveTimerRef.current !== null) {
				window.clearTimeout(saveTimerRef.current);
				saveTimerRef.current = null;
			}
			const unsavedEdits = unsavedEditsRef.current;
			const merge =
				isSameDocument && unsavedEdits !== null && latestDocRef.current !== null
					? mergeUnsavedEdits(
							unsavedEdits.baseText,
							latestDocRef.current.doc,
							result.doc,
						)
					: null;
			// Key order and the like aside, a merge that came to the file's own doc has
			// nothing to write, and the file's is drawn as it is
			const mergedDoc =
				merge?.kind === "merged" && !isSameJsonValue(merge.doc, result.doc)
					? merge.doc
					: null;
			const docToDraw = mergedDoc ?? result.doc;
			// Whatever was owed is now drawn, merged or over, so the old write is not
			// sent again; what the merge added is owed on top of this text
			unsavedEditsRef.current =
				mergedDoc === null ? null : { baseText: docText };
			hasUndeliveredEditsRef.current = false;
			saveRetryDelayMsRef.current = SAVE_RETRY_BASE_DELAY_MS;
			if (saveRetryTimerRef.current !== null) {
				window.clearTimeout(saveRetryTimerRef.current);
				saveRetryTimerRef.current = null;
			}
			syncedTextRef.current = docText;
			revisionRef.current = revision;
			latestDocRef.current = { identity, doc: docToDraw };
			setOpenDoc(identity);
			setDoc(docToDraw);
			mergeConflictMessageRef.current =
				merge?.kind === "merged" && merge.conflicts.length > 0
					? formatMergeConflictMessage(merge.conflicts)
					: null;
			if (mergedDoc !== null) {
				void saveNow();
			}
			if (hasLostEdit && previousDoc !== null) {
				reportError(formatLostEditMessage(previousDoc.relPath));
				return;
			}
			if (merge?.kind === "failed") {
				reportError(UNSAVED_EDITS_OVERWRITTEN_MESSAGE);
				return;
			}
			reportError(mergeConflictMessageRef.current);
		},
		[reportError, saveNow, saveWithoutDebounce],
	);

	/** Forgets the file held back, and stops watching for the gesture to end */
	const dropHeldFrame = useCallback((): void => {
		heldFrameRef.current = null;
		if (heldFrameTimerRef.current !== null) {
			window.clearTimeout(heldFrameTimerRef.current);
			heldFrameTimerRef.current = null;
		}
	}, []);

	/** Takes in the file held back behind the person's gesture, if there is one */
	const takeInHeldFrame = useCallback((): void => {
		const heldFrame = heldFrameRef.current;
		dropHeldFrame();
		if (heldFrame !== null) {
			takeInDoc(heldFrame);
		}
	}, [dropHeldFrame, takeInDoc]);
	useEffect(() => {
		takeInHeldFrameRef.current = takeInHeldFrame;
	}, [takeInHeldFrame]);

	/**
	 * Waits for the person to let go, then takes in the file held back. Past a drag's
	 * end or the editor closing, the canvas hands the commit over a frame or two
	 * later, and that is waited for too: taken in before it, the file would be
	 * merged without the person's last edit, which would then arrive on top of the
	 * merged doc as an edit of the doc before it, and write the other side's changes
	 * away.
	 *
	 * @param delayMs How long to wait before looking: 0 for a file that has just
	 *   arrived, the poll interval while the person is still at it
	 */
	const watchHeldFrame = useCallback((delayMs: number): void => {
		if (heldFrameTimerRef.current !== null) {
			return;
		}
		const timer = window.setTimeout(() => {
			void (async () => {
				if (!isPersonInteractingRef.current()) {
					await waitForCanvasFrames();
				}
				// Still this watch's turn: taking the frame in early clears the timer
				if (heldFrameTimerRef.current !== timer) {
					return;
				}
				heldFrameTimerRef.current = null;
				if (isPersonInteractingRef.current()) {
					watchHeldFrame(HELD_DOC_POLL_MS);
					return;
				}
				takeInHeldFrameRef.current?.();
			})();
		}, delayMs);
		heldFrameTimerRef.current = timer;
	}, []);
	useEffect(
		() => () => {
			if (heldFrameTimerRef.current !== null) {
				window.clearTimeout(heldFrameTimerRef.current);
			}
		},
		[],
	);

	const flushPendingSave = useCallback(
		async (options?: { isLeavingDocument?: boolean }): Promise<boolean> => {
			if (
				options?.isLeavingDocument === true ||
				!isPersonInteractingRef.current()
			) {
				takeInHeldFrame();
			}
			return await saveWithoutDebounce();
		},
		[saveWithoutDebounce, takeInHeldFrame],
	);

	const applyIncomingDoc = useCallback(
		(identity: DocIdentity, docText: string, revision: string): void => {
			const frame: DocFrame = { identity, docText, revision };
			const heldFrame = heldFrameRef.current;
			if (heldFrame !== null) {
				if (isSameDoc(heldFrame.identity, identity)) {
					// The file has moved on again: this is what gets taken in
					heldFrameRef.current = frame;
					return;
				}
				// Another document takes the page over, the gesture along with it. The
				// held file is left behind: the host asks for the edits to be written out
				// before it moves on, and that takes it in (flushPendingSave)
				dropHeldFrame();
			}
			// A newer file for the document drawn waits for the person's gesture, and
			// for the commit that ends it, whether or not one looks under way: the
			// commit of a drag released a moment ago is still on its way
			const isNewerFile =
				classifyIncomingDoc(frame, {
					identity: latestDocRef.current?.identity ?? null,
					syncedText: syncedTextRef.current,
					isFileUnusable:
						brokenFileErrorRef.current !== null || isFileMissingRef.current,
					hasUndeliveredEdits: hasUndeliveredEditsRef.current,
				}) === "new" &&
				isSameDoc(identity, latestDocRef.current?.identity ?? null);
			if (isNewerFile) {
				heldFrameRef.current = frame;
				watchHeldFrame(isPersonInteractingRef.current() ? HELD_DOC_POLL_MS : 0);
				return;
			}
			takeInDoc(frame);
		},
		[dropHeldFrame, takeInDoc, watchHeldFrame],
	);

	const applyDocError = useCallback(
		(identity: DocIdentity, message: string): void => {
			// An error about another file (one the host was switched to and could not
			// read) says nothing about the text this page synced
			if (isSameDoc(identity, latestDocRef.current?.identity ?? null)) {
				isFileMissingRef.current = true;
				// Older than what the host now says of the file
				dropHeldFrame();
			}
			reportError(`${identity.relPath}: ${message}`);
		},
		[dropHeldFrame, reportError],
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
			// The person has moved on from what a merge dropped
			mergeConflictMessageRef.current = null;
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
