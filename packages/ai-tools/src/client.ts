// The surface for whoever holds a mounted canvas (a browser). It exposes the
// applying side of the operations a document alone cannot answer: capturing,
// selection, the camera, measurements, reading the view state. Applying to the
// document itself is ./apply, which is not browser-only.

export { applyHandleOp } from "./client/applyHandleOp";
export { captureCanvasImage } from "./client/captureCanvasImage";
export { createCanvasHandleControl } from "./client/createCanvasHandleControl";
export type {
	AiHandleControl,
	AiSelectionResult,
	AiViewSnapshot,
	CapturePng,
} from "./client/types";
