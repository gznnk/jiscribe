import { execFile } from "node:child_process";
import { promisify } from "node:util";

import * as vscode from "vscode";

import {
	normalizeCommentAuthor,
	pickCommentAuthor,
	type CommandRunner,
} from "./commentAuthorResolution";

const execFileAsync = promisify(execFile);

const runCommand: CommandRunner = (file, args, options) =>
	execFileAsync(file, args, options);

/**
 * Resolve the display name the canvas writes onto comments posted in this
 * document's editor.
 *
 * The `jiscribe.commentAuthor` setting wins; left blank (its default), the git
 * `user.name` configured where the document sits is used instead. The lookup is
 * a plain `git config` call rather than the built-in git extension's API, so it
 * needs no extension dependency and the deciding half stays unit-testable (see
 * commentAuthorResolution).
 *
 * @param documentUri - the edited document: it scopes the setting lookup to its
 *   workspace folder, and its own folder is the git call's working directory.
 *   A document on a non-file scheme (a virtual workspace) has no local
 *   directory to run git in, so only the setting applies there
 * @returns the trimmed name, or undefined when neither source has one, which is
 *   what the Canvas reads as "the comment panel is read-only"
 */
export async function resolveCommentAuthor(
	documentUri: vscode.Uri,
): Promise<string | undefined> {
	const configuredAuthor = vscode.workspace
		.getConfiguration("jiscribe", documentUri)
		.get<string>("commentAuthor");
	if (documentUri.scheme !== "file") {
		return normalizeCommentAuthor(configuredAuthor);
	}
	const documentDirectory = vscode.Uri.joinPath(documentUri, "..").fsPath;
	return pickCommentAuthor(configuredAuthor, documentDirectory, runCommand);
}
