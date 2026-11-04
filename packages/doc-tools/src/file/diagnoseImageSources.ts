import { stat } from "node:fs/promises";
import path from "node:path";

import type { CanvasDoc, ObjectDoc } from "@jiscribe/doc";
import { resolveDocImageMimeType, splitDocRelativePath } from "@jiscribe/doc";

import { isInsideRoot } from "./isInsideRoot";
import { isErrnoWithCode } from "./nodeErrors";
import { realpathDeepestExisting } from "./realpathDeepestExisting";
import type { Diagnostic } from "../Diagnostic";
import { flattenObjects } from "../flattenObjects";

/** What a reader sees where an image cannot be drawn, and the two ways out of it. */
const PLACEHOLDER_CONSEQUENCE =
	"so the canvas draws a placeholder box in its place; put the file under the diagram's directory, or correct src to name the file there";

const toError = (object: ObjectDoc, message: string): Diagnostic => ({
	severity: "error",
	objectId: object.id,
	message,
});

/**
 * The finding about one image's `src`, or null when it names a regular file
 * inside the diagram's directory. Never names the path a link resolves to: the
 * `src` as written is all a message quotes.
 *
 * @param docDirPath - The directory the `.jis` sits in, as the caller spelled it
 * @param realDocDirPath - The same directory resolved through its links, which containment is judged against
 */
const diagnoseImageSource = async (
	object: ObjectDoc,
	src: string,
	docDirPath: string,
	realDocDirPath: string,
): Promise<Diagnostic | null> => {
	const segments = splitDocRelativePath(src);
	if (segments === null) {
		return toError(
			object,
			`src "${src}" is not a path relative to the diagram's own directory (no leading "/", no "." or ".." segment, no backslash, scheme or drive letter), which every host refuses, ${PLACEHOLDER_CONSEQUENCE}`,
		);
	}
	if (resolveDocImageMimeType(src) === null) {
		return toError(
			object,
			`src "${src}" does not end in an image file extension the hosts serve, ${PLACEHOLDER_CONSEQUENCE}`,
		);
	}
	const imagePath = path.join(docDirPath, ...segments);
	let realImagePath: string;
	try {
		realImagePath = await realpathDeepestExisting(imagePath);
	} catch {
		// No code: what made the walk fail may lie outside the diagram's directory,
		// which is not this check's to describe.
		return toError(
			object,
			`src "${src}" cannot be resolved to a file, ${PLACEHOLDER_CONSEQUENCE}`,
		);
	}
	if (!isInsideRoot(realDocDirPath, realImagePath)) {
		return {
			severity: "warning",
			objectId: object.id,
			message: `src "${src}" leads through a symbolic link to a file outside the diagram's directory: the MCP viewer refuses such an image and draws a placeholder box in its place (the other hosts follow the link and read it); move the file under the diagram's directory`,
		};
	}
	try {
		const imageStats = await stat(imagePath);
		return imageStats.isFile()
			? null
			: toError(
					object,
					`src "${src}" names something that is not a regular file (a directory, say), ${PLACEHOLDER_CONSEQUENCE}`,
				);
	} catch (error) {
		if (isErrnoWithCode(error, "ENOENT")) {
			return toError(
				object,
				`src "${src}" names a file that does not exist, ${PLACEHOLDER_CONSEQUENCE}`,
			);
		}
		const code = (error as NodeJS.ErrnoException).code ?? "unknown error";
		return toError(
			object,
			`src "${src}" cannot be read (${code}), ${PLACEHOLDER_CONSEQUENCE}`,
		);
	}
};

/**
 * Checks that every `image` in the document names a file a host can draw, the
 * way the hosts resolve it: `src` relative to the `.jis` file's own directory
 * (`splitDocRelativePath`), an image extension (`resolveDocImageMimeType`), and
 * a regular file there. An image failing any of these is drawn as a placeholder
 * box, which is an error. An image reached through a link leading out of the
 * directory is a warning: the MCP viewer refuses it, the CLI's render and
 * preview and the VSCode extension follow the link and draw it.
 *
 * Kept apart from `diagnoseDoc`, which reads no file; the CLI's `diagnose` and
 * the MCP `diagnose_canvas` run this after it on a document that validated.
 *
 * @param doc - A parsed document, as `validateDoc` returns; images inside groups are checked along with the ones at the root
 * @param canvasFilePath - Absolute path of the `.jis` the document was read from (as `toCanvasFilePath` resolves it, say); only its directory is used, and no message quotes it or anything resolved from it
 * @returns At most one diagnostic per image, in document order, each on the image's id; empty when every image's file is in place
 */
export const diagnoseImageSources = async (
	doc: CanvasDoc,
	canvasFilePath: string,
): Promise<Diagnostic[]> => {
	const images = flattenObjects(doc.root).flatMap((object) => {
		const src = (object as { src?: unknown }).src;
		return object.type === "image" && typeof src === "string"
			? [{ object, src }]
			: [];
	});
	if (images.length === 0) {
		return [];
	}
	const docDirPath = path.dirname(canvasFilePath);
	let realDocDirPath: string;
	try {
		realDocDirPath = await realpathDeepestExisting(docDirPath);
	} catch {
		return images.map(({ object, src }) =>
			toError(
				object,
				`src "${src}" cannot be resolved to a file, ${PLACEHOLDER_CONSEQUENCE}`,
			),
		);
	}
	const findings = await Promise.all(
		images.map(({ object, src }) =>
			diagnoseImageSource(object, src, docDirPath, realDocDirPath),
		),
	);
	return findings.filter((finding): finding is Diagnostic => finding !== null);
};
