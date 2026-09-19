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
 * - "json": `.jis`. `data` is the JSON text itself.
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
	 * `baseVersion` is the `version` of the newest Extension → Webview `update`
	 * this Webview had received when it built the commit, so the Extension can
	 * tell a commit that predates a change made outside the canvas from a current
	 * one; undefined when no update carried a version (image docs).
	 */
	| { type: "update"; data: string; baseVersion?: number }
	/** Undo requested on the canvas (delegated to the host editor's undo command). */
	| { type: "undo" }
	/** Redo requested on the canvas (delegated to the host editor's redo command). */
	| { type: "redo" }
	/**
	 * Response to requestImageExport. `data` is the source-embedded image bytes,
	 * base64-encoded for both PNG and SVG, or null when it could not be generated
	 * (e.g. Canvas not mounted).
	 */
	| { type: "imageExportResult"; requestId: number; data: string | null }
	/**
	 * The canvas has rendered a document and can export an image. Sent after every
	 * document the Webview adopts (the first after a (re)mount, and each update
	 * after that), so the Extension can reconcile a stale image left by a
	 * hidden-tab save (#179): a save while the Webview was discarded falls back to
	 * "old image + new source", and this lets the Extension re-render and rewrite
	 * once the tab is visible again. Repeats are harmless: the reconcile is a
	 * no-op unless one is pending and the document is clean, and a repeat is what
	 * gives a reconcile skipped while the document was dirty its next chance.
	 */
	| { type: "rendered" }
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
	  }
	/**
	 * Requests the bytes of an image an `image` shape names. `src` is the raw
	 * string from the doc, relative to the document's folder; the Extension
	 * checks the rule and reads the file. Answered by imageResolved carrying the
	 * same `requestId`.
	 */
	| { type: "resolveImage"; requestId: ImageRequestId; src: string };

/** Messages sent Extension → Webview via webviewPanel.webview.postMessage(). */
export type ExtensionToWebviewMessage =
	/**
	 * The file's current contents, sent on ready and on a change the Extension
	 * did not make itself. The meaning of `data` depends on `docType` (see
	 * JiscribeDocType); omitted docType means "json".
	 */
	| {
			type: "update";
			data: string;
			docType?: JiscribeDocType;
			/**
			 * `vscode.TextDocument.version` the `data` was read at, quoted back as
			 * `baseVersion` on every commit the Webview builds from it. Present for
			 * the text editor; the image editor has no document version and omits it.
			 */
			version?: number;
	  }
	/**
	 * The display name to write onto comments posted from the canvas, resolved
	 * from the `jiscribe.commentAuthor` setting or the document's git
	 * `user.name` (see resolveCommentAuthor). Sent after the initial update and
	 * again whenever the setting changes for this document; `author` undefined
	 * means neither source had one, which leaves the comment panel read-only.
	 */
	| { type: "commentAuthor"; author: string | undefined }
	/**
	 * On saving `.jis.png` / `.jis.svg`, requests the current canvas image
	 * (source embedded). The Webview responds with imageExportResult.
	 */
	| { type: "requestImageExport"; requestId: number; format: "png" | "svg" }
	/** Answer to resolveImage; see {@link ImageResolvedMessage}. */
	| ImageResolvedMessage;

/**
 * Identifies one resolveImage round trip. A page-unique string rather than a
 * counter: the Webview is discarded and rebuilt whenever its tab hides (#138), and
 * a plain counter would hand the new page the ids the old page's answers are still
 * addressed to (see createWebviewImageResolver).
 */
export type ImageRequestId = string;

/**
 * Answer to a resolveImage request, carrying its `requestId`.
 *
 * The image bytes travel as base64 over postMessage rather than as a webview
 * URI, so nothing has to be added to the Webview's CSP or localResourceRoots.
 * `ok` discriminates the two halves: the Webview turns the success case into a
 * Blob and rejects the pending request with `error` otherwise.
 */
export type ImageResolvedMessage =
	| {
			type: "imageResolved";
			requestId: ImageRequestId;
			ok: true;
			/** The image file's bytes, base64-encoded (no data-URL header). */
			base64: string;
			/** MIME type derived from the file's extension, for the Blob's type. */
			mimeType: string;
	  }
	| {
			type: "imageResolved";
			requestId: ImageRequestId;
			ok: false;
			/** Why the image could not be supplied, phrased for a developer's console. */
			error: string;
	  };
