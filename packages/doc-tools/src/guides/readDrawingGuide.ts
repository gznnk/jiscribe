import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

/**
 * The module specifier each guide is read from. Resolved at run time through
 * node rather than bundled in, so `@jiscribe/doc-schema` stays the single source
 * of the prose; a bundling host stages the files where its bundle resolves them
 * (jiscribe-mcp's build.mjs).
 */
const DRAWING_GUIDE_SPECIFIERS = {
	drawing: "@jiscribe/doc-schema/canvas-prompt",
	"json-format": "@jiscribe/doc-schema/authoring-json",
} as const;

/** The name a guide is asked for by. */
export type DrawingGuideName = keyof typeof DRAWING_GUIDE_SPECIFIERS;

/** Every guide name, in the order a host lists them. */
export const DRAWING_GUIDE_NAMES = Object.keys(
	DRAWING_GUIDE_SPECIFIERS,
) as readonly DrawingGuideName[];

/**
 * Whether a string names a guide.
 *
 * @param value - Matched exactly, case included
 */
export const isDrawingGuideName = (value: string): value is DrawingGuideName =>
	Object.hasOwn(DRAWING_GUIDE_SPECIFIERS, value);

/**
 * A guide that could not be handed out: the installation is incomplete. The
 * message is fit to show as it is; a host with an error class of its own wraps
 * it.
 */
export class DrawingGuideError extends Error {}

const require = createRequire(import.meta.url);

/**
 * Read one guide off disk, resolved through `@jiscribe/doc-schema`'s exports.
 *
 * A missing or empty file is thrown rather than answered with nothing: it means
 * the guide was not installed (or a bundle was not staged with it), and an
 * empty answer would let that ship unnoticed.
 *
 * @param guide - Which guide; the markdown comes back exactly as stored, its version stamp comment first
 * @throws DrawingGuideError when the guide cannot be resolved or read, or is empty (whitespace only counts as empty)
 */
export const readDrawingGuide = (guide: DrawingGuideName): string => {
	const specifier = DRAWING_GUIDE_SPECIFIERS[guide];
	let markdown: string;
	try {
		markdown = readFileSync(require.resolve(specifier), "utf8");
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new DrawingGuideError(
			`the "${guide}" guide could not be read from ${specifier}, so this installation is incomplete: ${reason}`,
		);
	}
	if (markdown.trim() === "") {
		throw new DrawingGuideError(
			`the "${guide}" guide at ${specifier} is empty, so this installation is incomplete`,
		);
	}
	return markdown;
};
