import * as vscode from "vscode";

/**
 * Replace a document's entire text the way the canvas editor writes back.
 *
 * The range is recomputed from the document on every call, exactly as
 * JiscribeEditorProvider does, so consecutive calls stay valid as the text
 * changes length.
 *
 * @param document - an open document; it does not need to be shown in an editor
 * @param text - written with "\n" separators, which VSCode normalizes to the
 *   document's own line ending
 * @returns applyEdit's result: false when VSCode refused the edit outright
 */
export function replaceWholeDocument(
	document: vscode.TextDocument,
	text: string,
): Thenable<boolean> {
	const edit = new vscode.WorkspaceEdit();
	const lastLine = document.lineAt(document.lineCount - 1);
	edit.replace(
		document.uri,
		new vscode.Range(0, 0, document.lineCount - 1, lastLine.text.length),
		text,
	);
	return vscode.workspace.applyEdit(edit);
}

/** One `onDidChangeTextDocument` event, reduced to what the suites assert on. */
export interface RecordedChange {
	/** The document's full text as of the event. */
	readonly text: string;
	/**
	 * How many ranges the event carried. VSCode also raises this event with none
	 * of them, for a document whose metadata moved but whose text did not — the
	 * clean-to-dirty transition of the first edit is the one seen here. Counting
	 * events therefore counts more than edits; filter on this instead.
	 */
	readonly contentChangeCount: number;
}

/** Collects the change events of one document while a test runs. */
export interface ChangeEventRecorder extends vscode.Disposable {
	/** Every recorded event, in arrival order. */
	readonly changes: readonly RecordedChange[];
}

/**
 * Record every `onDidChangeTextDocument` event for one document.
 *
 * Recording the text rather than the event lets a test assert both the order the
 * events arrived in and what the document held at each one — which is how a
 * write-back loop shows itself, as an event carrying text nobody wrote.
 *
 * @param document - events for any other URI are ignored, so a document another
 *   suite left open cannot pollute the list
 * @returns a recorder to dispose before the test ends; an undisposed listener
 *   outlives the suite and keeps recording
 */
export function recordChangeEvents(
	document: vscode.TextDocument,
): ChangeEventRecorder {
	const changes: RecordedChange[] = [];
	const documentKey = document.uri.toString();
	const subscription = vscode.workspace.onDidChangeTextDocument((event) => {
		if (event.document.uri.toString() === documentKey) {
			changes.push({
				text: event.document.getText(),
				contentChangeCount: event.contentChanges.length,
			});
		}
	});
	return {
		changes,
		dispose: () => subscription.dispose(),
	};
}

/**
 * The texts carried by the recorded events that actually changed the text,
 * in arrival order.
 *
 * @param recorder - a recorder from {@link recordChangeEvents}; its
 *   metadata-only events are dropped here (see {@link RecordedChange})
 */
export function textsOfContentChanges(recorder: ChangeEventRecorder): string[] {
	return recorder.changes
		.filter((change) => change.contentChangeCount > 0)
		.map((change) => change.text);
}
