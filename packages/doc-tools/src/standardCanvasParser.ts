import { createCanvasParser } from "@jiscribe/doc";
import { standardDocPlugins } from "@jiscribe/standard-shapes/doc";

let sharedParser: ReturnType<typeof createCanvasParser> | null = null;

/**
 * The canvas parser loaded with the shipped shape set, built on first use and
 * shared by everything in this package that reads a document.
 */
export const getStandardCanvasParser = (): ReturnType<
	typeof createCanvasParser
> => {
	sharedParser ??= createCanvasParser({ plugins: standardDocPlugins });
	return sharedParser;
};
