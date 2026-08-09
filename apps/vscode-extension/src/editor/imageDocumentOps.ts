import {
	insertPngTextChunk,
	PNG_SOURCE_KEYWORD,
	readPngTextChunk,
} from "@jiscribe/canvas/png-source";
import {
	extractCanvasSourceFromSvgText,
	replaceCanvasSourceInSvgText,
} from "@jiscribe/canvas/svg-source";

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
	/** Image bytes last written to (or read from) the file; base for the embed fallback. */
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
export function extractSourceFromImage(
	kind: JiscribeImageKind,
	bytes: Uint8Array,
): string | null {
	return kind === "png"
		? readPngTextChunk(bytes, PNG_SOURCE_KEYWORD)
		: extractCanvasSourceFromSvgText(Buffer.from(bytes).toString("utf8"));
}

/** Decode a webview render response (base64 image bytes) into bytes. */
function decodeRenderResult(data: string): Uint8Array {
	return new Uint8Array(Buffer.from(data, "base64"));
}

/**
 * Save fallback: re-embed the current source into the last saved image bytes.
 * The image looks as of the last save, but the source (edits) isn't lost. If
 * there's no source or the image is corrupt, return the image unchanged.
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
	if (doc.kind === "png") {
		try {
			return insertPngTextChunk(
				doc.savedBytes,
				PNG_SOURCE_KEYWORD,
				doc.sourceText,
			);
		} catch {
			return doc.savedBytes;
		}
	}
	const replacedText = replaceCanvasSourceInSvgText(
		Buffer.from(doc.savedBytes).toString("utf8"),
		doc.sourceText,
	);
	return replacedText === null
		? doc.savedBytes
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

/** Revert File: roll back the state to the file's on-disk contents. */
export async function revertImageDocument(
	doc: ImageDocState,
	seams: ImageDocSeams,
): Promise<void> {
	const bytes = await seams.readFile();
	doc.savedBytes = bytes;
	doc.sourceText = extractSourceFromImage(doc.kind, bytes);
	// Disk image and source are now consistent, so drop any pending reconcile (#179).
	doc.needsImageReconcile = false;
}
