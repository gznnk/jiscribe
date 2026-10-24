// Reading and writing canvas files from Node: the path gate, a validated load, a
// write-back that refuses to leave the file worse than it found it, and the atomic
// replacement under it. The package root has no file reading or writing; this
// entry is where it lives.
//
// e.g. `import { loadCanvasFile, saveCanvasFile } from "@jiscribe/doc-tools/file";`
export {
	CANVAS_FILE_EXTENSIONS,
	CanvasFileError,
	createEmptyCanvasDoc,
	ensureCanvasFile,
	formatParseResult,
	loadCanvasFile,
	readCanvasFileText,
	saveCanvasFile,
	serializeCanvasFile,
	toCanvasFilePath,
} from "./canvasStore";
export type { LoadedCanvasFile, SaveCanvasFileOptions } from "./canvasStore";

export {
	isSameFileIdentity,
	prepareAtomicWrite,
	readFileSnapshot,
	writeFileAtomically,
} from "./atomicWrite";
export type {
	FileIdentity,
	FileSnapshot,
	PreparedAtomicWrite,
} from "./atomicWrite";

export { realpathDeepestExisting } from "./realpathDeepestExisting";

export { isErrnoWithCode } from "./nodeErrors";

// The parser every function here (and validateDoc) reads with, for a host that
// judges a file's text the same way without loading it
export { getStandardCanvasParser } from "../standardCanvasParser";
