// The surface for whoever holds a mounted canvas (a browser). It exposes the
// applying side of the operations a document alone cannot answer: capturing,
// selection, the camera, measurements, reading the view state. Applying to the
// document itself is ./apply, which is not browser-only.

export { applyHandleOp } from "./client/applyHandleOp";
export { captureCanvasImage } from "./client/captureCanvasImage";
export { createCanvasHandleControl } from "./client/createCanvasHandleControl";
export { toBase64 } from "./client/toBase64";
// How result text writes numbers, ids and rects, for a host answering an op of
// its own in the same shape
export { formatNumber, formatRect, quoteIds } from "./resultText";
export type {
	AiHandleControl,
	AiSelectionResult,
	AiViewSnapshot,
	CapturePng,
} from "./client/types";
