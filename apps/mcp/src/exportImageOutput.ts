// Where export_image may write. The output names a file on the AI's say-so, so
// it is held to the directory the viewer serves (the host's workspaceRoot, the
// one the .jis on display sits in), checked through symlinks as the file API's
// own paths are, and to the two image extensions.

import { stat } from "node:fs/promises";
import path from "node:path";

import { CanvasFileError, realpathDeepestExisting } from "./canvasStore";
import {
	resolveWorkspacePathReal,
	WorkspacePathError,
} from "./host/workspacePaths";
import type { ExportImageOp } from "./shared/canvasHostProtocol";

/** The formats export_image writes, named by the output's extension */
export type ExportImageFormat = ExportImageOp["format"];

const FORMATS_BY_EXTENSION: Readonly<Record<string, ExportImageFormat>> = {
	".png": "png",
	".svg": "svg",
};

/**
 * The names an editable diagram saved as an image takes. Written over with a
 * plain export, the `.jis` source it carries would be gone
 */
const CANVAS_IMAGE_NAME_PATTERN = /\.jis\.(?:png|svg)$/i;

/**
 * Reads the format off an output path's extension.
 *
 * @param outputPath The path as the tool was given it; case does not matter
 * @returns null for an extension that is neither .png nor .svg
 */
export const readExportImageFormat = (
	outputPath: string,
): ExportImageFormat | null =>
	FORMATS_BY_EXTENSION[path.extname(outputPath).toLowerCase()] ?? null;

/**
 * Whether an output path is named as a `.jis.png` / `.jis.svg`, which
 * export_image refuses whether or not the file exists.
 *
 * @param outputPath The path as the tool was given it; case does not matter
 */
export const isCanvasImageName = (outputPath: string): boolean =>
	CANVAS_IMAGE_NAME_PATTERN.test(outputPath);

/**
 * Resolves export_image's output to the path to write, refusing one outside the
 * workspace (lexically or through a link) or in a directory that does not exist.
 *
 * The parent directory is resolved through its links before it is compared with
 * the workspace root, which is itself resolved: a .jis opened through a linked
 * directory has an output beside it named through the same link. The file name
 * is left as it is, so a link there is checked for where it leads and then
 * replaced by the write rather than followed (see resolveWorkspacePathReal).
 *
 * @param workspaceRoot The host's workspace root (absolute, resolved through links)
 * @param outputPath The absolute path the tool was given
 * @returns The absolute path to write
 * @throws CanvasFileError naming why the output cannot be written
 */
export async function resolveExportImageOutputPath(
	workspaceRoot: string,
	outputPath: string,
): Promise<string> {
	const absoluteOutput = path.resolve(outputPath);
	const realParentPath = await realpathDeepestExisting(
		path.dirname(absoluteOutput),
	);
	const relPath = path.relative(
		workspaceRoot,
		path.join(realParentPath, path.basename(absoluteOutput)),
	);
	let targetPath: string;
	try {
		targetPath = await resolveWorkspacePathReal(workspaceRoot, relPath);
	} catch (error) {
		if (error instanceof WorkspacePathError) {
			throw new CanvasFileError(
				`${outputPath} is not under ${workspaceRoot}, the directory of the canvas on display, which is the only place export_image writes to`,
			);
		}
		throw error;
	}
	const parentStats = await stat(path.dirname(targetPath)).catch(() => null);
	if (parentStats === null || !parentStats.isDirectory()) {
		throw new CanvasFileError(
			`${path.dirname(absoluteOutput)} does not exist; export_image writes into an existing directory and creates none`,
		);
	}
	const targetStats = await stat(targetPath).catch(() => null);
	if (targetStats?.isDirectory() === true) {
		throw new CanvasFileError(
			`${outputPath} is a directory; name a file inside it instead`,
		);
	}
	return targetPath;
}
