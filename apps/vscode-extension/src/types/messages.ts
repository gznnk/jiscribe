/**
 * Message types for communication between the VSCode Extension and the Webview.
 *
 * A Custom Editor's Extension (Node.js) and Webview (browser) are separate and
 * cannot call each other directly; they exchange JSON-serializable objects via
 * postMessage(). Sharing these types on both sides catches format mismatches at
 * compile time.
 */

/**
 * Kind of the edited document; decides how an update message's `data` is read.
 *
 * - "json": `.jis.json`. `data` is the JSON text itself.
 * - "svg" / "png": `.jis.svg` / `.jis.png`. The Extension has already extracted
 *   the embedded source, so `data` is JSON text in both directions (empty
 *   string when there is no embedded source). The image itself (full SVG / PNG
 *   bytes) is generated and exchanged separately at save time via
 *   requestImageExport / imageExportResult.
 */
export type JiscribeDocType = "json" | "svg" | "png";

/** Messages sent Webview → Extension via acquireVsCodeApi().postMessage(). */
export type WebviewToExtensionMessage =
	/** Webview initialized; requests the initial file contents. */
	| { type: "ready" }
	/**
	 * Requests writing canvas edits back. `data` is always the doc's JSON text
	 * (for image docs the Extension tracks dirty state and renders at save time).
	 */
	| { type: "update"; data: string; saveNonce: string }
	/** Undo requested on the canvas (delegated to the host editor's undo command). */
	| { type: "undo" }
	/** Redo requested on the canvas (delegated to the host editor's redo command). */
	| { type: "redo" }
	/**
	 * Response to requestImageExport. `data` is the source-embedded image (png:
	 * base64 PNG bytes / svg: SVG text), or null when it could not be generated
	 * (e.g. Canvas not mounted).
	 */
	| { type: "imageExportResult"; requestId: number; data: string | null }
	/**
	 * Requests saving an image produced by the export dialog to the workspace.
	 * `base64` holds the image bytes (base64 for both PNG and SVG text). The
	 * Extension derives the file name and shows the save dialog.
	 */
	| {
			type: "exportImage";
			format: "png" | "svg";
			base64: string;
			includesSource: boolean;
	  };

/** Messages sent Extension → Webview via webviewPanel.webview.postMessage(). */
export type ExtensionToWebviewMessage =
	/**
	 * Sends the latest file contents to the Webview. The meaning of `data`
	 * depends on `docType` (see JiscribeDocType); omitted docType means "json".
	 */
	| {
			type: "update";
			data: string;
			saveNonce?: string;
			docType?: JiscribeDocType;
	  }
	/**
	 * On saving `.jis.png` / `.jis.svg`, requests the current canvas image
	 * (source embedded). The Webview responds with imageExportResult.
	 */
	| { type: "requestImageExport"; requestId: number; format: "png" | "svg" };
