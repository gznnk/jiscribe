import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as vscode from "vscode";

/**
 * Create a directory for one suite's fixture files.
 *
 * Fixtures are built per run instead of being committed: several of them are
 * deliberately broken canvas documents, and a committed one would be picked up
 * by the repository's own schema and format checks. The directory lives under
 * the OS temp directory so nothing is ever written into the working tree.
 *
 * @returns the absolute path of a fresh, empty directory; hand it to
 *   {@link removeFixtureDirectory} from the suite's `after` hook
 */
export function createFixtureDirectory(): Promise<string> {
	return mkdtemp(join(tmpdir(), "jiscribe-vscode-test-"));
}

/**
 * Delete a fixture directory and everything under it.
 *
 * @param directoryPath - a path from {@link createFixtureDirectory}; one that is
 *   already gone is not an error, so this is safe in a failing suite's teardown
 */
export function removeFixtureDirectory(directoryPath: string): Promise<void> {
	return rm(directoryPath, { recursive: true, force: true });
}

/**
 * Write one fixture file and return the URI the editor commands take.
 *
 * Written through node's `fs` rather than `vscode.workspace.fs`, so the file is
 * already on disk before VSCode ever hears of it. A test that later writes the
 * same path through `vscode.workspace.fs` is then making a change the editor
 * sees exactly as it would see one from another tool.
 *
 * @param directoryPath - the suite's fixture directory
 * @param fileName - name including the full extension (".jis", ".jis.png", ...);
 *   the compound ones matter, since the custom editor selectors match on them
 * @param contents - text is written as UTF-8 with no BOM and no line-ending
 *   rewriting, so a "\r\n" in it reaches disk as CRLF
 */
export async function writeFixtureFile(
	directoryPath: string,
	fileName: string,
	contents: string | Uint8Array,
): Promise<vscode.Uri> {
	const filePath = join(directoryPath, fileName);
	await writeFile(filePath, contents);
	return vscode.Uri.file(filePath);
}
