// The two drawing guides @jiscribe/doc-schema generates, read off disk the same
// way by every host that hands them out (jiscribe-mcp's read_drawing_guide, the
// CLI's `jiscribe guide`).
//
// e.g. `import { readDrawingGuide } from "@jiscribe/doc-tools/guides";`
export {
	DRAWING_GUIDE_NAMES,
	DrawingGuideError,
	isDrawingGuideName,
	readDrawingGuide,
} from "./readDrawingGuide";
export type { DrawingGuideName } from "./readDrawingGuide";
