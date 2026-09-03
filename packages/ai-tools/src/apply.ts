// The surface for whoever actually holds the document (the canvas in a browser,
// a file in a workspace). It depends on neither React nor the DOM, so Node can
// read it too.

export { applyCanvasOp } from "./apply/applyCanvasOp";
export {
	type CanvasOpHistory,
	createCanvasOpHistory,
} from "./apply/canvasOpHistory";
export type { AiDocBridge } from "./apply/docBridge";
