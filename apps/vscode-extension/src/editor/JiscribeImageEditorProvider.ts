import {
	insertPngTextChunk,
	PNG_SOURCE_KEYWORD,
	readPngTextChunk,
} from "@workspace/canvas/png-source";
import {
	extractCanvasSourceFromSvgText,
	replaceCanvasSourceInSvgText,
} from "@workspace/canvas/svg-source";
import * as vscode from "vscode";

import { saveExportedImage } from "./saveExportedImage";
import { getCanvasWebviewHtml } from "./webviewHtml";
import type {
	ExtensionToWebviewMessage,
	WebviewToExtensionMessage,
} from "../types/messages";

/**
 * Max wait for the Webview's image-generation response. Responses normally
 * return in a few hundred ms; past this we treat the Webview as unresponsive
 * and fall back.
 */
const IMAGE_EXPORT_TIMEOUT_MS = 10_000;

/** Image document kind; decides the source-embedding format and save-time rendering. */
type JiscribeImageKind = "png" | "svg";

/**
 * CustomDocument for `.jis.png` / `.jis.svg`.
 *
 * TextDocument can't be used for image editors, so we hold the document state
 * (source JSON and the last saved image bytes) ourselves.
 */
class JiscribeImageDocument implements vscode.CustomDocument {
	/**
	 * @param uri - document URI
	 * @param kind - image kind (png / svg)
	 * @param savedBytes - image bytes last written to (or read from) the file;
	 *   the base for the save fallback that re-embeds the latest source when the
	 *   Webview can't respond
	 * @param sourceText - current `.jis.json` source; null means no embedded
	 *   source (shown as an uneditable error)
	 */
	constructor(
		public readonly uri: vscode.Uri,
		public readonly kind: JiscribeImageKind,
		public savedBytes: Uint8Array,
		public sourceText: string | null,
	) {}

	/**
	 * True when the last save fell back to the embed path (hidden/unresponsive
	 * Webview), so the on-disk image is stale relative to the source (#179). The
	 * Extension re-renders and rewrites once the tab becomes visible again.
	 */
	public needsImageReconcile = false;

	/** Guards against overlapping reconcile writes when multiple renders fire. */
	public reconcileInFlight = false;

	dispose(): void {
		// Only in-memory bytes are held, so no explicit cleanup is needed.
	}
}

/**
 * Custom editor provider that opens source-embedded images (`.jis.png` /
 * `.jis.svg`, analogous to draw.io's `.drawio.png` / `.drawio.svg`) in the
 * Canvas UI.
 *
 * Both implement dirty tracking, save, and backup themselves as a
 * CustomEditorProvider. PNG is binary so CustomTextEditorProvider can't be used;
 * SVG is text but re-rendering the full SVG on every edit would make the commit
 * path depend on DOM rendering (and fail), so it uses the same scheme and defers
 * rendering to save time.
 *
 * Data flow:
 *   open:  read file → extract embedded source JSON (png: iTXt / svg:
 *          <metadata>) → send to Webview
 *   edit:  doc JSON arrives from Webview → fire edit event (dirty / undo / redo)
 *   save:  ask Webview to render (fit-to-content re-render + re-embed source) →
 *          write file. If the Webview can't respond, fall back to "existing
 *          image + re-embedded latest source" (image looks as it did at the last
 *          save, but the source isn't lost).
 */
export class JiscribeImageEditorProvider implements vscode.CustomEditorProvider<JiscribeImageDocument> {
	constructor(private readonly context: vscode.ExtensionContext) {}

	// dirty / undo / redo notification channel. Firing this event tells VSCode
	// the document was edited; VSCode manages the undo/redo stack and calls the
	// event's undo() / redo() back on Ctrl+Z / Ctrl+Y.
	private readonly changeEmitter = new vscode.EventEmitter<
		vscode.CustomDocumentEditEvent<JiscribeImageDocument>
	>();
	public readonly onDidChangeCustomDocument = this.changeEmitter.event;

	// Visible panel per document (at most one, since
	// supportsMultipleEditorsPerDocument: false). Used for save-time image
	// requests and reflecting undo/redo.
	private readonly panels = new Map<
		JiscribeImageDocument,
		vscode.WebviewPanel
	>();

	// Pending requestImageExport responses, keyed by requestId.
	private nextRequestId = 1;
	private readonly pendingExports = new Map<
		number,
		(data: string | null) => void
	>();

	/** Read the file (or its backup) and build the document. */
	public async openCustomDocument(
		uri: vscode.Uri,
		openContext: vscode.CustomDocumentOpenContext,
		_token: vscode.CancellationToken,
	): Promise<JiscribeImageDocument> {
		// On hot-exit restore, read the backup instead (URI stays the original file).
		const readUri = openContext.backupId
			? vscode.Uri.parse(openContext.backupId)
			: uri;
		const kind = kindFromPath(uri.path);
		const bytes = await vscode.workspace.fs.readFile(readUri);
		return new JiscribeImageDocument(
			uri,
			kind,
			bytes,
			extractSourceFromImage(kind, bytes),
		);
	}

	/** Initialize the editor (Webview) and wire up its messaging with the document. */
	public async resolveCustomEditor(
		document: JiscribeImageDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken,
	): Promise<void> {
		this.panels.set(document, webviewPanel);

		webviewPanel.webview.options = { enableScripts: true };
		webviewPanel.webview.html = getCanvasWebviewHtml(
			webviewPanel.webview,
			this.context.extensionUri,
		);

		const messageListener = webviewPanel.webview.onDidReceiveMessage(
			(message: WebviewToExtensionMessage) => {
				switch (message.type) {
					case "ready":
						this.updateWebview(webviewPanel, document);
						break;

					case "undo":
						vscode.commands.executeCommand("undo");
						break;

					case "redo":
						vscode.commands.executeCommand("redo");
						break;

					case "update": {
						// Canvas edit. Unlike the text editor, don't write to the file;
						// just mark dirty via the edit event (the actual write happens at
						// save). undo/redo are called back by VSCode, so capture the
						// before/after source in the closure to revert / re-apply.
						const beforeText = document.sourceText;
						const afterText = message.data;
						document.sourceText = afterText;
						this.changeEmitter.fire({
							document,
							label: "Canvas edit",
							undo: () => {
								document.sourceText = beforeText;
								this.pushSourceToWebview(document);
							},
							redo: () => {
								document.sourceText = afterText;
								this.pushSourceToWebview(document);
							},
						});
						break;
					}

					case "imageExportResult": {
						const resolve = this.pendingExports.get(message.requestId);
						if (resolve) {
							this.pendingExports.delete(message.requestId);
							resolve(message.data);
						}
						break;
					}

					case "rendered":
						// The canvas is mounted and can export now. If a prior hidden-tab
						// save left a stale image on disk (#179), re-render and rewrite it.
						void this.reconcileStaleImage(document);
						break;

					case "exportImage":
						// Save the exported image to the workspace (save dialog → write → notify).
						void saveExportedImage(
							document.uri,
							message.format,
							message.base64,
							message.includesSource,
						);
						break;
				}
			},
		);

		webviewPanel.onDidDispose(() => {
			messageListener.dispose();
			if (this.panels.get(document) === webviewPanel) {
				this.panels.delete(document);
			}
		});
	}

	/** Save (overwrite in place). */
	public async saveCustomDocument(
		document: JiscribeImageDocument,
		token: vscode.CancellationToken,
	): Promise<void> {
		const { bytes, fresh } = await this.renderCurrentImage(document);
		if (token.isCancellationRequested) {
			return;
		}
		await vscode.workspace.fs.writeFile(document.uri, bytes);
		document.savedBytes = bytes;
		// The rendered image embeds the live canvas source (canvasStateRef), which
		// can be newer than sourceText (the 'update' message is coalesced by the
		// commit scheduler, #125). Re-sync sourceText to what actually landed on
		// disk so the backup/undo baseline (embedCurrentSource) matches the file
		// instead of re-embedding a stale source (#178).
		const embeddedSource = extractSourceFromImage(document.kind, bytes);
		if (embeddedSource !== null) {
			document.sourceText = embeddedSource;
		}
		// A fallback save (hidden/unresponsive Webview) writes the old rendered
		// image with the new source. Flag it so the image is re-rendered and
		// rewritten once the tab is visible again (#179). Nothing to reconcile when
		// there is no source (the image can't change).
		document.needsImageReconcile = !fresh && document.sourceText !== null;
	}

	/**
	 * Save As. The image format is decided by the destination's extension (look
	 * at `destination`, not `document.kind`), so a cross-format save such as
	 * `.jis.png` → `.jis.svg` writes bytes in the destination's format.
	 */
	public async saveCustomDocumentAs(
		document: JiscribeImageDocument,
		destination: vscode.Uri,
		token: vscode.CancellationToken,
	): Promise<void> {
		const destinationKind = kindFromPath(destination.path);
		const { bytes } = await this.renderCurrentImage(document, destinationKind);
		if (token.isCancellationRequested) {
			return;
		}
		await vscode.workspace.fs.writeFile(destination, bytes);
	}

	/** Revert File: roll back to the file's on-disk contents. */
	public async revertCustomDocument(
		document: JiscribeImageDocument,
		_token: vscode.CancellationToken,
	): Promise<void> {
		const bytes = await vscode.workspace.fs.readFile(document.uri);
		document.savedBytes = bytes;
		document.sourceText = extractSourceFromImage(document.kind, bytes);
		// Disk image and source are now consistent, so drop any pending reconcile (#179).
		document.needsImageReconcile = false;
		this.pushSourceToWebview(document);
	}

	/**
	 * Hot-exit backup. This can be called while the editor is hidden, so write
	 * reliably via the embed fallback that doesn't depend on a Webview round-trip
	 * (the image may stay as of the last save, but as long as the source remains,
	 * the edits are recoverable).
	 */
	public async backupCustomDocument(
		document: JiscribeImageDocument,
		context: vscode.CustomDocumentBackupContext,
		_token: vscode.CancellationToken,
	): Promise<vscode.CustomDocumentBackup> {
		const bytes = this.embedCurrentSource(document);
		await vscode.workspace.fs.writeFile(context.destination, bytes);
		return {
			id: context.destination.toString(),
			delete: async () => {
				try {
					await vscode.workspace.fs.delete(context.destination);
				} catch {
					// Nothing to do if the backup is already gone.
				}
			},
		};
	}

	/** Send the current source JSON to the Webview (reflecting undo/redo/revert). */
	private pushSourceToWebview(document: JiscribeImageDocument): void {
		const panel = this.panels.get(document);
		if (panel) {
			this.updateWebview(panel, document);
		}
	}

	/**
	 * Send the document's current source to the Webview. When there's no embedded
	 * source, send an empty string so the Webview switches to its "no editable
	 * source" display.
	 */
	private updateWebview(
		panel: vscode.WebviewPanel,
		document: JiscribeImageDocument,
	): void {
		const message: ExtensionToWebviewMessage = {
			type: "update",
			data: document.sourceText ?? "",
			docType: document.kind,
		};
		panel.webview.postMessage(message);
	}

	/**
	 * Get image bytes in `targetKind` format reflecting the current source.
	 * First choice is a Webview re-render (fit-to-content, latest look). If there
	 * is no Webview or it doesn't respond, fall back to the last saved image with
	 * the latest source re-embedded (same format only; see below).
	 *
	 * `fresh` reports whether the bytes came from a live Webview render; `false`
	 * means the (stale-image) fallback was taken, so the caller can flag the
	 * document for reconciliation (#179).
	 */
	private async renderCurrentImage(
		document: JiscribeImageDocument,
		targetKind: JiscribeImageKind = document.kind,
	): Promise<{ bytes: Uint8Array; fresh: boolean }> {
		const panel = this.panels.get(document);
		// With retainContextWhenHidden: false, a hidden tab's Webview has a
		// discarded JS context and won't answer postMessage. Fall back immediately
		// instead of waiting for the timeout.
		if (panel && panel.visible) {
			const data = await this.requestImageFromWebview(panel, targetKind);
			if (data !== null) {
				const bytes =
					targetKind === "png"
						? new Uint8Array(Buffer.from(data, "base64"))
						: new Uint8Array(Buffer.from(data, "utf8"));
				return { bytes, fresh: true };
			}
		}
		return {
			bytes: this.embedCurrentSource(document, targetKind),
			fresh: false,
		};
	}

	/**
	 * Re-render the current source and rewrite the file when a prior hidden-tab
	 * save left a stale image on disk (#179). Called on the Webview's "rendered"
	 * signal, so the canvas is mounted and can export. No-op unless a reconcile is
	 * pending and the tab is visible; the source on disk is already current, so
	 * this only refreshes the rendered image bytes (no dirty state is introduced).
	 */
	private async reconcileStaleImage(
		document: JiscribeImageDocument,
	): Promise<void> {
		const panel = this.panels.get(document);
		if (
			!panel ||
			!panel.visible ||
			!document.needsImageReconcile ||
			document.reconcileInFlight
		) {
			return;
		}
		document.reconcileInFlight = true;
		try {
			// The image on disk already embeds this source; reconcile only refreshes
			// the rendered bytes for it. Capture it so we can detect an edit/undo
			// landing during the async render below.
			const sourceAtStart = document.sourceText;
			const data = await this.requestImageFromWebview(panel, document.kind);
			// Give up this attempt if the render failed or the tab was hidden again;
			// the flag stays set so a later "rendered" retries.
			if (data === null || !panel.visible) {
				return;
			}
			// An edit/undo changed the source mid-render, so the file is now dirty and
			// its render will be written by the normal save flow. Writing here would
			// push unsaved edits to disk; skip and clear the flag (the save path owns
			// reconciliation from now on).
			if (document.sourceText !== sourceAtStart) {
				document.needsImageReconcile = false;
				return;
			}
			const bytes =
				document.kind === "png"
					? new Uint8Array(Buffer.from(data, "base64"))
					: new Uint8Array(Buffer.from(data, "utf8"));
			await vscode.workspace.fs.writeFile(document.uri, bytes);
			document.savedBytes = bytes;
			const embeddedSource = extractSourceFromImage(document.kind, bytes);
			if (embeddedSource !== null) {
				document.sourceText = embeddedSource;
			}
			document.needsImageReconcile = false;
		} finally {
			document.reconcileInFlight = false;
		}
	}

	/** Ask the Webview to generate the image and await the response (with timeout). */
	private requestImageFromWebview(
		panel: vscode.WebviewPanel,
		format: JiscribeImageKind,
	): Promise<string | null> {
		const requestId = this.nextRequestId++;
		const message: ExtensionToWebviewMessage = {
			type: "requestImageExport",
			requestId,
			format,
		};
		return new Promise<string | null>((resolve) => {
			const timeout = setTimeout(() => {
				this.pendingExports.delete(requestId);
				resolve(null);
			}, IMAGE_EXPORT_TIMEOUT_MS);
			this.pendingExports.set(requestId, (data) => {
				clearTimeout(timeout);
				resolve(data);
			});
			panel.webview.postMessage(message);
		});
	}

	/**
	 * Save fallback: re-embed the current source into the last saved image bytes.
	 * The image looks as of the last save, but the source (edits) isn't lost. If
	 * there's no source or the image is corrupt, return the image unchanged.
	 *
	 * The base `savedBytes` is in `document.kind` format, so a different format
	 * (a cross-format Save As where `targetKind` differs) can't be produced here.
	 * Writing wrong-format bytes would corrupt the file and lose the diagram, so
	 * treat it as an unrecoverable fallback and throw, letting VSCode report the error.
	 */
	private embedCurrentSource(
		document: JiscribeImageDocument,
		targetKind: JiscribeImageKind = document.kind,
	): Uint8Array {
		if (targetKind !== document.kind) {
			throw new Error(
				`Cannot save as .jis.${targetKind}: the canvas must be open and ` +
					`visible to render a ${targetKind.toUpperCase()} image.`,
			);
		}
		if (document.sourceText === null) {
			return document.savedBytes;
		}
		if (document.kind === "png") {
			try {
				return insertPngTextChunk(
					document.savedBytes,
					PNG_SOURCE_KEYWORD,
					document.sourceText,
				);
			} catch {
				return document.savedBytes;
			}
		}
		const replacedText = replaceCanvasSourceInSvgText(
			Buffer.from(document.savedBytes).toString("utf8"),
			document.sourceText,
		);
		return replacedText === null
			? document.savedBytes
			: new Uint8Array(Buffer.from(replacedText, "utf8"));
	}
}

/** Determine the image kind from the URI path (anything but `.jis.svg` is png). */
function kindFromPath(path: string): JiscribeImageKind {
	return path.endsWith(".jis.svg") ? "svg" : "png";
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
