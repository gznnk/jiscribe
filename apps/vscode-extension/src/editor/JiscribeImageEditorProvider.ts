import * as vscode from "vscode";

import {
	adoptDiskBytes,
	classifyExternalChange,
	computeExportBytes,
	embedCurrentSource,
	readSourceFromImageFile,
	reconcileImageDocument,
	revertImageDocument,
	saveImageDocument,
	type ImageDocSeams,
	type ImageDocState,
	type JiscribeImageKind,
} from "./imageDocumentOps";
import { resolveCanvasWebview } from "./resolveCanvasWebview";
import type { ExtensionToWebviewMessage } from "../types/messages";

/**
 * Max wait for the Webview's image-generation response. Responses normally
 * return in a few hundred ms; past this we treat the Webview as unresponsive
 * and fall back.
 */
const IMAGE_EXPORT_TIMEOUT_MS = 10_000;

/**
 * Wait after a file-watcher event before reading the file, so a burst of events
 * from one external write (or a non-atomic writer) coalesces into one check.
 */
const EXTERNAL_CHANGE_DEBOUNCE_MS = 200;

/**
 * CustomDocument for `.jis.png` / `.jis.svg`.
 *
 * TextDocument can't be used for image editors, so we hold the document state
 * (source JSON and the last saved image bytes) ourselves. The save-time
 * orchestration lives in imageDocumentOps (VSCode-free, unit-tested); this class
 * is just that state plus the CustomDocument requirements (uri / dispose).
 */
class JiscribeImageDocument implements vscode.CustomDocument, ImageDocState {
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

	public needsImageReconcile = false;
	public reconcileInFlight = false;

	/**
	 * Bytes of this editor's most recent write to the file, recorded before the
	 * write lands so a watcher event racing the save still recognizes it as our
	 * own; null until the first write.
	 */
	public lastOwnWrite: Uint8Array | null = null;

	/** Guards against stacking conflict prompts while one is already open. */
	public conflictPromptOpen = false;

	/** Debounce timer for coalescing file-watcher events (one check per burst). */
	public externalCheckTimer: ReturnType<typeof setTimeout> | undefined;

	/** Watches the document's file for external changes; lives with the document. */
	public fileWatcher: vscode.FileSystemWatcher | undefined;

	dispose(): void {
		clearTimeout(this.externalCheckTimer);
		this.fileWatcher?.dispose();
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
 *          <metadata>; a file created empty opens as a new document) → send to
 *          Webview
 *   edit:  doc JSON arrives from Webview → fire edit event (dirty / undo / redo)
 *   save:  ask Webview to render (fit-to-content re-render + re-embed source) →
 *          write file. If the Webview can't respond, fall back to "existing
 *          image + re-embedded latest source" (image looks as it did at the last
 *          save, but the source isn't lost); see imageDocumentOps.
 *
 * A file watcher follows external changes to the file: adopted silently while
 * the document is clean, resolved via a prompt while it is dirty (see
 * checkExternalChange).
 */
export class JiscribeImageEditorProvider implements vscode.CustomEditorProvider<JiscribeImageDocument> {
	constructor(private readonly context: vscode.ExtensionContext) {
		// The provider lives for the whole session, and changeEmitter holds the
		// undo/redo closures of every edit (each capturing a full source string),
		// so tie its release to the extension instead of leaving it unowned.
		context.subscriptions.push(this.changeEmitter);
	}

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
		const document = new JiscribeImageDocument(
			uri,
			kind,
			bytes,
			readSourceFromImageFile(kind, bytes),
		);
		this.watchExternalChanges(document);
		return document;
	}

	/**
	 * Watch the document's file so a change made outside this editor (MCP, git,
	 * another tool) is picked up instead of being clobbered by the next save. The
	 * watcher is disposed with the document.
	 */
	private watchExternalChanges(document: JiscribeImageDocument): void {
		// Watch the parent directory with `*` and filter by URI. The pattern is a
		// glob with no escape syntax, so putting the file name into it would make
		// a name containing a metacharacter (`[`, `{`, ...) silently never match.
		const watcher = vscode.workspace.createFileSystemWatcher(
			new vscode.RelativePattern(vscode.Uri.joinPath(document.uri, ".."), "*"),
		);
		const documentKey = document.uri.toString();
		const onFileEvent = (uri: vscode.Uri) => {
			if (uri.toString() === documentKey) {
				this.scheduleExternalCheck(document);
			}
		};
		// Create covers replace-by-rename writers, whose change may surface as a
		// re-creation of the path.
		watcher.onDidChange(onFileEvent);
		watcher.onDidCreate(onFileEvent);
		document.fileWatcher = watcher;
	}

	/** Debounced entry: one checkExternalChange per burst of watcher events. */
	private scheduleExternalCheck(document: JiscribeImageDocument): void {
		clearTimeout(document.externalCheckTimer);
		document.externalCheckTimer = setTimeout(() => {
			void this.checkExternalChange(document);
		}, EXTERNAL_CHANGE_DEBOUNCE_MS);
	}

	/**
	 * Read the file back after a watcher event and react per its classification:
	 * ignore our own write's echo, silently follow the disk while the document
	 * has no unsaved edits (like a text editor), and ask the user when it does.
	 */
	private async checkExternalChange(
		document: JiscribeImageDocument,
	): Promise<void> {
		let diskBytes: Uint8Array;
		try {
			diskBytes = await vscode.workspace.fs.readFile(document.uri);
		} catch {
			// Deleted or unreadable; there is no disk state to follow.
			return;
		}
		const changeKind = classifyExternalChange(
			document,
			diskBytes,
			document.lastOwnWrite,
			this.isDocumentDirty(document),
		);
		if (changeKind === "own-echo") {
			return;
		}
		if (changeKind === "adopt") {
			adoptDiskBytes(document, diskBytes);
			this.pushSourceToWebview(document);
			return;
		}
		await this.promptExternalConflict(document);
	}

	/**
	 * Ask the user to resolve a dirty-document external change. "Reload from
	 * Disk" adopts the disk state as an undoable edit (the document stays dirty,
	 * but its content matches the file and Ctrl+Z brings the edits back);
	 * keeping the edits changes nothing, so the next save overwrites the
	 * external change — that is the choice being made.
	 */
	private async promptExternalConflict(
		document: JiscribeImageDocument,
	): Promise<void> {
		if (document.conflictPromptOpen) {
			return;
		}
		document.conflictPromptOpen = true;
		try {
			const fileName = document.uri.path.split("/").pop() ?? document.uri.path;
			const reloadChoice = "Reload from Disk";
			const choice = await vscode.window.showWarningMessage(
				`"${fileName}" changed on disk, and this editor has unsaved edits. ` +
					`Saving will overwrite the changes on disk.`,
				reloadChoice,
				"Keep My Edits",
			);
			if (choice !== reloadChoice) {
				return;
			}
			// Re-read at resolution time: the file may have changed again while the
			// prompt was open.
			let diskBytes: Uint8Array;
			try {
				diskBytes = await vscode.workspace.fs.readFile(document.uri);
			} catch {
				return;
			}
			const beforeText = document.sourceText;
			adoptDiskBytes(document, diskBytes);
			const afterText = document.sourceText;
			this.changeEmitter.fire({
				document,
				label: "Reload from disk",
				undo: () => {
					document.sourceText = beforeText;
					this.pushSourceToWebview(document);
				},
				redo: () => {
					document.sourceText = afterText;
					this.pushSourceToWebview(document);
				},
			});
			this.pushSourceToWebview(document);
		} finally {
			document.conflictPromptOpen = false;
		}
	}

	/**
	 * Whether the document's tab shows unsaved edits. VSCode owns the dirty flag
	 * (we only fire edit events), so read it off the tab; a document whose tab is
	 * already gone counts as clean.
	 */
	private isDocumentDirty(document: JiscribeImageDocument): boolean {
		const documentKey = document.uri.toString();
		for (const tabGroup of vscode.window.tabGroups.all) {
			for (const tab of tabGroup.tabs) {
				if (
					tab.input instanceof vscode.TabInputCustom &&
					tab.input.uri.toString() === documentKey
				) {
					return tab.isDirty;
				}
			}
		}
		return false;
	}

	/** Initialize the editor (Webview) and wire up its messaging with the document. */
	public async resolveCustomEditor(
		document: JiscribeImageDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken,
	): Promise<void> {
		this.panels.set(document, webviewPanel);

		resolveCanvasWebview(webviewPanel, {
			extensionUri: this.context.extensionUri,
			documentUri: document.uri,

			onReady: () => this.updateWebview(webviewPanel, document),

			onUpdate: (data) => {
				// Canvas edit. Unlike the text editor, don't write to the file; just
				// mark dirty via the edit event (the actual write happens at save).
				// undo/redo are called back by VSCode, so capture the before/after
				// source in the closure to revert / re-apply.
				const beforeText = document.sourceText;
				const afterText = data;
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
			},

			onImageExportResult: (requestId, data) => {
				const resolve = this.pendingExports.get(requestId);
				if (resolve) {
					this.pendingExports.delete(requestId);
					resolve(data);
				}
			},

			onRendered: () => {
				// The canvas is mounted and can export now. If a prior hidden-tab save
				// left a stale image on disk (#179), re-render and rewrite it.
				void reconcileImageDocument(document, this.makeSeams(document));
			},

			// Drop the panel only if it is still the one registered; a reopened tab
			// may already have replaced it.
			onDispose: () => {
				if (this.panels.get(document) === webviewPanel) {
					this.panels.delete(document);
				}
			},
		});
	}

	/** Save (overwrite in place). */
	public async saveCustomDocument(
		document: JiscribeImageDocument,
		token: vscode.CancellationToken,
	): Promise<void> {
		await saveImageDocument(document, this.makeSeams(document, token));
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
		const { bytes } = await computeExportBytes(
			document,
			this.makeSeams(document),
			destinationKind,
		);
		if (token.isCancellationRequested) {
			return;
		}
		// Save As over the document's own file is still our write, not an external
		// change for the watcher.
		if (destination.toString() === document.uri.toString()) {
			document.lastOwnWrite = bytes;
		}
		await vscode.workspace.fs.writeFile(destination, bytes);
	}

	/** Revert File: roll back to the file's on-disk contents. */
	public async revertCustomDocument(
		document: JiscribeImageDocument,
		_token: vscode.CancellationToken,
	): Promise<void> {
		await revertImageDocument(document, this.makeSeams(document));
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
		const bytes = embedCurrentSource(document);
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

	/**
	 * Build the VSCode-backed effects the ops delegate to: webview render, file
	 * read/write on the document's URI, and (for save) the cancel token.
	 */
	private makeSeams(
		document: JiscribeImageDocument,
		token?: vscode.CancellationToken,
	): ImageDocSeams {
		return {
			render: (kind) => this.renderViaWebview(document, kind),
			readFile: async () => vscode.workspace.fs.readFile(document.uri),
			writeFile: async (bytes) => {
				// Record before the write lands so the watcher event can never see the
				// new bytes without us remembering having written them.
				document.lastOwnWrite = bytes;
				await vscode.workspace.fs.writeFile(document.uri, bytes);
			},
			isCancelled: token ? () => token.isCancellationRequested : undefined,
		};
	}

	/**
	 * Render the current canvas via the live Webview, or null when unavailable.
	 * With retainContextWhenHidden: false, a hidden tab's Webview has a discarded
	 * JS context and won't answer postMessage, so return null immediately instead
	 * of waiting for the timeout.
	 */
	private renderViaWebview(
		document: JiscribeImageDocument,
		kind: JiscribeImageKind,
	): Promise<string | null> {
		const panel = this.panels.get(document);
		if (!panel || !panel.visible) {
			return Promise.resolve(null);
		}
		return this.requestImageFromWebview(panel, kind);
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
}

/**
 * Determine the image kind from the URI path (anything but `.svg` is png).
 * A Save As destination is free text, so a plain `.svg` (no `.jis.`) must
 * still get SVG bytes.
 */
function kindFromPath(path: string): JiscribeImageKind {
	return path.toLowerCase().endsWith(".svg") ? "svg" : "png";
}
