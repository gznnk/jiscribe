import {
	insertPngTextChunk,
	PNG_SOURCE_KEYWORD,
	readPngTextChunk,
} from "@jiscribe/doc/png-source";
import {
	extractCanvasSourceFromSvgText,
	replaceCanvasSourceInSvgText,
} from "@jiscribe/doc/svg-source";

import { EMPTY_CANVAS_DOC_JSON } from "../canvasDocSource";

/**
 * Save-time orchestration for `.jis.png` / `.jis.svg` documents, extracted from
 * JiscribeImageEditorProvider so it can be unit-tested without VSCode. The
 * provider adapts VSCode (webview round-trip, `vscode.workspace.fs`, cancel
 * token) into the {@link ImageDocSeams} injected here; these functions hold the
 * fallback / reconcile / re-sync logic (#178 / #179).
 */

/** Image document kind; decides the source-embedding format and save-time rendering. */
export type JiscribeImageKind = "png" | "svg";

/**
 * Mutable image-document state the ops read and update. JiscribeImageDocument
 * (the provider's CustomDocument) satisfies this structurally.
 */
export interface ImageDocState {
	readonly kind: JiscribeImageKind;
	/**
	 * Image bytes last written to (or read from) the file; base for the embed
	 * fallback. Empty while the file holds no image yet (created empty, unsaved).
	 */
	savedBytes: Uint8Array;
	/** Current `.jis.json` source; null means no embedded source (uneditable error). */
	sourceText: string | null;
	/** A prior fallback save left a stale image on disk; reconcile when visible (#179). */
	needsImageReconcile: boolean;
	/** Guards against overlapping reconcile writes when multiple renders fire. */
	reconcileInFlight: boolean;
}

/** Effects the ops delegate to the host (webview round-trip + fs), injectable for tests. */
export interface ImageDocSeams {
	/**
	 * Render the current canvas via the live webview; null when unavailable (no
	 * webview / hidden tab / unresponsive). Both PNG and SVG bytes are base64.
	 */
	render(kind: JiscribeImageKind): Promise<string | null>;
	/** Read the document file's bytes (revert). */
	readFile(): Promise<Uint8Array>;
	/** Write bytes to the document file. */
	writeFile(bytes: Uint8Array): Promise<void>;
	/** True when the in-progress save was cancelled (save only; optional). */
	isCancelled?(): boolean;
}

/** Extract the embedded source JSON from image bytes (null if absent). */
function extractSourceFromImage(
	kind: JiscribeImageKind,
	bytes: Uint8Array,
): string | null {
	return kind === "png"
		? readPngTextChunk(bytes, PNG_SOURCE_KEYWORD)
		: extractCanvasSourceFromSvgText(Buffer.from(bytes).toString("utf8"));
}

/**
 * Read the editable source out of a canvas image file's bytes.
 *
 * A file created empty in the Explorer (or by `touch`) holds no image to read a
 * source from. Reporting "no editable source" there would make "create the file,
 * then draw" a dead end, so treat it as a new document. Nothing is written back
 * for it: the file stays empty on disk until the first save.
 *
 * @param kind - image kind, deciding which embedding is read
 * @param bytes - the file's current bytes; empty yields EMPTY_CANVAS_DOC_JSON
 * @returns the embedded source JSON, or null when the image carries none (an
 *   image not exported from jiscribe), which the editor shows as uneditable
 */
export function readSourceFromImageFile(
	kind: JiscribeImageKind,
	bytes: Uint8Array,
): string | null {
	if (bytes.length === 0) {
		return EMPTY_CANVAS_DOC_JSON;
	}
	return extractSourceFromImage(kind, bytes);
}

/** 1x1 transparent PNG (real encoder output), the placeholder image's bytes. */
const PLACEHOLDER_PNG_BASE64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** Empty SVG carrying the source element replaceCanvasSourceInSvgText rewrites. */
const PLACEHOLDER_SVG_TEXT =
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">` +
	`<metadata><jiscribe:source xmlns:jiscribe="https://jiscribe.dev/ns/canvas" ` +
	`data-jiscribe-version="1"></jiscribe:source></metadata></svg>`;

/**
 * Blank image to embed the source into when the file holds no image yet (created
 * empty in the Explorer and not yet saved from a visible tab). Without it the
 * embed below has nothing to write into and the save would drop the edits.
 *
 * What lands on disk is a blank picture with the real source, which is the same
 * bargain the fallback already makes with a stale picture — and the same repair:
 * saveImageDocument flags a reconcile, so the picture is re-rendered and
 * rewritten once the tab is visible again (#179).
 */
function placeholderImageBytes(kind: JiscribeImageKind): Uint8Array {
	return kind === "png"
		? new Uint8Array(Buffer.from(PLACEHOLDER_PNG_BASE64, "base64"))
		: new Uint8Array(Buffer.from(PLACEHOLDER_SVG_TEXT, "utf8"));
}

/** Decode a webview render response (base64 image bytes) into bytes. */
function decodeRenderResult(data: string): Uint8Array {
	return new Uint8Array(Buffer.from(data, "base64"));
}

/**
 * Save fallback: re-embed the current source into the last saved image bytes.
 * The image looks as of the last save, but the source (edits) isn't lost. If
 * there's no source or the image is corrupt, return the image unchanged. A file
 * with no image yet embeds into a blank placeholder instead
 * ({@link placeholderImageBytes}).
 *
 * The base `savedBytes` is in `doc.kind` format, so a different format (a
 * cross-format Save As where `targetKind` differs) can't be produced here.
 * Writing wrong-format bytes would corrupt the file and lose the diagram, so
 * treat it as an unrecoverable fallback and throw.
 */
export function embedCurrentSource(
	doc: ImageDocState,
	targetKind: JiscribeImageKind = doc.kind,
): Uint8Array {
	if (targetKind !== doc.kind) {
		throw new Error(
			`Cannot save as .jis.${targetKind}: the canvas must be open and ` +
				`visible to render a ${targetKind.toUpperCase()} image.`,
		);
	}
	if (doc.sourceText === null) {
		return doc.savedBytes;
	}
	const baseBytes =
		doc.savedBytes.length === 0
			? placeholderImageBytes(doc.kind)
			: doc.savedBytes;
	if (doc.kind === "png") {
		try {
			return insertPngTextChunk(baseBytes, PNG_SOURCE_KEYWORD, doc.sourceText);
		} catch {
			return baseBytes;
		}
	}
	const replacedText = replaceCanvasSourceInSvgText(
		Buffer.from(baseBytes).toString("utf8"),
		doc.sourceText,
	);
	return replacedText === null
		? baseBytes
		: new Uint8Array(Buffer.from(replacedText, "utf8"));
}

/**
 * Get image bytes in `targetKind` format reflecting the current source. First
 * choice is a live webview render (fit-to-content, latest look); if the webview
 * is unavailable, fall back to the last saved image with the latest source
 * re-embedded (same format only).
 *
 * `fresh` reports whether the bytes came from a live render; `false` means the
 * (stale-image) fallback was taken, so the caller can flag reconciliation (#179).
 */
export async function computeExportBytes(
	doc: ImageDocState,
	seams: ImageDocSeams,
	targetKind: JiscribeImageKind = doc.kind,
): Promise<{ bytes: Uint8Array; fresh: boolean }> {
	const data = await seams.render(targetKind);
	if (data !== null) {
		return { bytes: decodeRenderResult(data), fresh: true };
	}
	return { bytes: embedCurrentSource(doc, targetKind), fresh: false };
}

/** Re-sync the state to bytes that just landed on disk. */
function adoptSavedBytes(doc: ImageDocState, bytes: Uint8Array): void {
	doc.savedBytes = bytes;
	// The rendered image embeds the live canvas source (canvasStateRef), which can
	// be newer than sourceText (the 'update' message is coalesced by the commit
	// scheduler, #125). Re-sync sourceText to what actually landed on disk so the
	// backup/undo baseline (embedCurrentSource) matches the file instead of
	// re-embedding a stale source (#178).
	const embedded = extractSourceFromImage(doc.kind, bytes);
	if (embedded !== null) {
		doc.sourceText = embedded;
	}
}

/** Save (overwrite in place): render → write → re-sync → flag reconcile on fallback. */
export async function saveImageDocument(
	doc: ImageDocState,
	seams: ImageDocSeams,
): Promise<void> {
	const { bytes, fresh } = await computeExportBytes(doc, seams);
	if (seams.isCancelled?.()) {
		return;
	}
	await seams.writeFile(bytes);
	adoptSavedBytes(doc, bytes);
	// A fallback save (hidden/unresponsive webview) writes the old rendered image
	// with the new source. Flag it so the image is re-rendered and rewritten once
	// the tab is visible again (#179). Nothing to reconcile when there is no source
	// (the image can't change).
	doc.needsImageReconcile = !fresh && doc.sourceText !== null;
}

/**
 * Re-render the current source and rewrite the file when a prior hidden-tab save
 * left a stale image on disk (#179). Called on the webview's "rendered" signal,
 * so the canvas is mounted and can export. No-op unless a reconcile is pending;
 * the source on disk is already current, so this only refreshes the image bytes
 * (no dirty state is introduced).
 */
export async function reconcileImageDocument(
	doc: ImageDocState,
	seams: ImageDocSeams,
): Promise<void> {
	if (!doc.needsImageReconcile || doc.reconcileInFlight) {
		return;
	}
	doc.reconcileInFlight = true;
	try {
		// The image on disk already embeds this source; reconcile only refreshes the
		// rendered bytes for it. Capture it so we can detect an edit/undo landing
		// during the async render below.
		const sourceAtStart = doc.sourceText;
		const data = await seams.render(doc.kind);
		// The webview couldn't render (still hidden / unresponsive); leave the flag
		// set so a later "rendered" retries.
		if (data === null) {
			return;
		}
		// An edit/undo changed the source mid-render, so the file is now dirty and
		// its render will be written by the normal save flow. Writing here would push
		// unsaved edits to disk; skip and clear the flag (the save path owns
		// reconciliation from now on).
		if (doc.sourceText !== sourceAtStart) {
			doc.needsImageReconcile = false;
			return;
		}
		const bytes = decodeRenderResult(data);
		await seams.writeFile(bytes);
		adoptSavedBytes(doc, bytes);
		doc.needsImageReconcile = false;
	} finally {
		doc.reconcileInFlight = false;
	}
}

/**
 * Make the on-disk bytes the document's truth: revert, and adopting an external
 * change. Unlike the save-time re-sync (adoptSavedBytes), this also accepts a
 * file with no embedded source — the editor then shows it as uneditable, the
 * same as opening that file fresh.
 *
 * @param doc - document state to overwrite
 * @param bytes - the file's current on-disk bytes
 */
export function adoptDiskBytes(doc: ImageDocState, bytes: Uint8Array): void {
	doc.savedBytes = bytes;
	doc.sourceText = readSourceFromImageFile(doc.kind, bytes);
	// Disk image and source are now consistent, so drop any pending reconcile (#179).
	doc.needsImageReconcile = false;
}

/** Revert File: roll back the state to the file's on-disk contents. */
export async function revertImageDocument(
	doc: ImageDocState,
	seams: ImageDocSeams,
): Promise<void> {
	adoptDiskBytes(doc, await seams.readFile());
}

/**
 * What a file-watcher event on the document's file means for the editor.
 *
 * - "own-echo": the bytes are what this editor last wrote; nothing to do
 * - "adopt": a real external change and the document has no unsaved edits;
 *   follow the disk silently (adoptDiskBytes), like a text editor does
 * - "conflict": a real external change while the document is dirty; the user
 *   must choose between reloading and keeping the unsaved edits
 */
export type ExternalChangeKind = "own-echo" | "adopt" | "conflict";

const areBytesEqual = (a: Uint8Array, b: Uint8Array): boolean =>
	a.length === b.length && a.every((byte, i) => byte === b[i]);

/**
 * Classify a file-watcher event by comparing the disk bytes with what the
 * editor believes is on disk.
 *
 * @param doc - document state; savedBytes is one of the "our own write" baselines
 * @param diskBytes - the file's bytes read after the watcher fired
 * @param lastOwnWrite - bytes of the editor's most recent write, recorded before
 *   the write lands so a watcher event racing adoptSavedBytes still matches;
 *   null when this editor has not written yet
 * @param isDirty - whether the document has unsaved edits (VSCode's dirty flag)
 */
export function classifyExternalChange(
	doc: ImageDocState,
	diskBytes: Uint8Array,
	lastOwnWrite: Uint8Array | null,
	isDirty: boolean,
): ExternalChangeKind {
	if (
		areBytesEqual(diskBytes, doc.savedBytes) ||
		(lastOwnWrite !== null && areBytesEqual(diskBytes, lastOwnWrite))
	) {
		return "own-echo";
	}
	return isDirty ? "conflict" : "adopt";
}
