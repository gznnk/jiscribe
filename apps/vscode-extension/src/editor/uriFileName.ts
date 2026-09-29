/**
 * Last segment of a URI's path, for naming the file in a message to the user.
 *
 * Takes anything carrying a `path` rather than a `vscode.Uri`, so it stays
 * usable (and unit-testable) without VSCode. It reads `Uri.path`, whose
 * separator is `/` on every platform, not the OS-dependent `fsPath`.
 *
 * @param uri - the URI to name; a path with no `/` is returned whole, and one
 *   ending in `/` (or an empty path) yields an empty string
 * @returns the file name, never undefined
 */
export function uriFileName(uri: { path: string }): string {
	return uri.path.split("/").pop() ?? uri.path;
}
