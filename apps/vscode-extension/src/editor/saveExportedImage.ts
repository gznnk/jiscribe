import * as vscode from "vscode";

/** Fallback file name in `jiscribe-YYYYMMDD-HHmmss` form (no extension). */
const buildTimestampedName = (): string => {
	const now = new Date();
	const pad = (value: number): string => String(value).padStart(2, "0");
	return (
		`jiscribe-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
		`-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
	);
};

/**
 * Derive the default export destination from the edited document's URI.
 *
 * - Folder: the document's folder (workspace root for untitled).
 * - File name: replace the document's extension (whole double extension like
 *   `.jis.json`) with the export format's; untitled uses a timestamped name.
 * - If the derived name equals the document itself (e.g. exporting a
 *   source-embedded PNG while editing `.jis.png`), append `-export` to avoid
 *   overwriting the source.
 */
const buildDefaultUri = (
	documentUri: vscode.Uri,
	extension: string,
): vscode.Uri | undefined => {
	if (documentUri.scheme === "untitled") {
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
		return workspaceRoot
			? vscode.Uri.joinPath(
					workspaceRoot,
					`${buildTimestampedName()}${extension}`,
				)
			: undefined;
	}
	const documentFileName =
		documentUri.path.split("/").pop() ?? documentUri.path;
	// Handles *.jis / *.jiscribe / *.jis.json / *.jiscribe.json / *.jis.svg /
	// *.jis.png (see package.json's filenamePattern). Strips the full `.jiscribe`
	// too (foo.jiscribe.json → foo.jis.png). The second alternative covers the
	// single-segment extensions, which have no trailing `.json`.
	const baseName = documentFileName.replace(
		/(?:\.jis|\.jiscribe)?\.(?:json|svg|png)$|\.(?:jis|jiscribe)$/i,
		"",
	);
	let exportFileName = `${baseName || buildTimestampedName()}${extension}`;
	if (exportFileName === documentFileName) {
		exportFileName = `${baseName}-export${extension}`;
	}
	return vscode.Uri.joinPath(documentUri, "..", exportFileName);
};

/**
 * Save an image produced by the export dialog to the workspace (the handler
 * body for the Webview's "exportImage" message).
 *
 * Prompts for a destination via the save dialog (overwrite confirmation is
 * VSCode's own) and, on success, notifies with a Reveal action. Does nothing on
 * cancel. Errors are notified internally, so this Promise never rejects.
 */
export const saveExportedImage = async (
	documentUri: vscode.Uri,
	format: "png" | "svg",
	base64: string,
	includesSource: boolean,
): Promise<void> => {
	const extension = includesSource ? `.jis.${format}` : `.${format}`;
	const destination = await vscode.window.showSaveDialog({
		defaultUri: buildDefaultUri(documentUri, extension),
		filters:
			format === "png" ? { "PNG Image": ["png"] } : { "SVG Image": ["svg"] },
	});
	if (!destination) {
		return;
	}

	try {
		await vscode.workspace.fs.writeFile(
			destination,
			new Uint8Array(Buffer.from(base64, "base64")),
		);
	} catch (err) {
		console.error("[Jiscribe] Failed to save exported image:", err);
		const detail = err instanceof Error ? `: ${err.message}` : "";
		vscode.window.showErrorMessage(
			`Jiscribe: Failed to save exported image${detail}`,
		);
		return;
	}

	const savedFileName = destination.path.split("/").pop() ?? destination.path;
	const revealAction = "Reveal in Explorer";
	const selected = await vscode.window.showInformationMessage(
		`Jiscribe: Exported "${savedFileName}"`,
		revealAction,
	);
	if (selected === revealAction) {
		try {
			await vscode.commands.executeCommand("revealFileInOS", destination);
		} catch {
			// Fall back to the Explorer view when the OS file manager can't be
			// opened (e.g. a remote environment).
			try {
				await vscode.commands.executeCommand("revealInExplorer", destination);
			} catch (err) {
				// The fallback can also fail (e.g. a destination outside the
				// workspace). The save itself succeeded, so per contract we just
				// notify instead of rejecting.
				console.error("[Jiscribe] Failed to reveal exported image:", err);
				vscode.window.showWarningMessage(
					`Jiscribe: Could not reveal "${savedFileName}" in Explorer`,
				);
			}
		}
	}
};
