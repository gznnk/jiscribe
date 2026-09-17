/**
 * Decides whether a canvas commit is still current, extracted from
 * JiscribeEditorProvider so it can be unit-tested without VSCode (the same shape
 * as latestWriteSerializer).
 *
 * A commit is the canvas' whole document and is written over the file's whole
 * range, so one built before a change made outside the canvas silently undoes
 * that change. The window is real: the canvas' save scheduler delays commits
 * (#125), and a side-by-side text editor or another extension can move the
 * document meanwhile. Every `update` the editor posts is therefore stamped with
 * the document version its text was read at, the Webview quotes the newest stamp
 * it received back as the commit's `baseVersion`, and a commit whose base
 * predates that stamp is dropped instead of written.
 *
 * Only what the Webview was actually sent is stamped, which is what keeps a run
 * of canvas commits writable: each write echoes back as a change event the
 * editor recognizes as its own and does not forward (see selfWriteTracker), so
 * the stamp stays where the canvas still is.
 */

/** Version bookkeeping for one editor's Webview; see the module comment. */
export interface CommitGate {
	/**
	 * Version stamped on the newest update posted to the Webview; undefined until
	 * the first one, and only ever used to explain a dropped commit.
	 */
	readonly lastForwardedVersion: number | undefined;
	/**
	 * Record the version stamped on an update about to be posted to the Webview.
	 *
	 * @param version - `vscode.TextDocument.version` the posted text was read at;
	 *   VSCode only ever increases it, undo and redo included
	 */
	stamp(version: number): void;
	/**
	 * Whether a commit built against `baseVersion` may still be written.
	 *
	 * @param baseVersion - the version the Webview quoted; before the first stamp
	 *   anything is accepted, after it an undefined base is refused like a stale
	 *   one (every update this gate's Webview was sent carried a version, so a
	 *   commit without one was not built from any of them)
	 * @returns false when the Webview has since been sent a document newer than
	 *   the one the commit was built from, or quotes none at all
	 */
	accepts(baseVersion: number | undefined): boolean;
}

/**
 * Create a gate over one editor's Webview.
 *
 * @returns the gate, holding the stamps of a single Webview; it is per editor
 *   and must not be shared between documents
 */
export function createCommitGate(): CommitGate {
	let lastForwardedVersion: number | undefined;

	return {
		get lastForwardedVersion(): number | undefined {
			return lastForwardedVersion;
		},

		stamp(version: number): void {
			lastForwardedVersion = version;
		},

		accepts(baseVersion: number | undefined): boolean {
			if (lastForwardedVersion === undefined) {
				return true;
			}
			return baseVersion !== undefined && baseVersion >= lastForwardedVersion;
		},
	};
}
