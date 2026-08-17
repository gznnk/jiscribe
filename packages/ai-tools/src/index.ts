// The declaration of the canvas tool set an AI can call — each tool naming the
// canvas API behind it — and the derivation that fills in which shape types those
// tools may name. Transport-free: how the tools are handed to a model belongs to
// the host.

export type { CanvasApiRef } from "./canvasApiRef";
export {
	type AiAddObjectParams,
	type AiAlignEdge,
	type AiArrowType,
	type AiCanvasOp,
	type AiCanvasOpOutcome,
	type AiConnectEntry,
	type AiDistributeAxis,
	type AiDocOp,
	type AiFitTarget,
	type AiHandleOp,
	type AiInlineTextStyleParams,
	type AiNewObject,
	type AiObjectFilter,
	type AiPoint,
	type AiRect,
	type AiRouting,
	type AiSetPointsEntry,
	type AiSetPositionEntry,
	type AiSetTextEntry,
	type AiSetTextStyleEntry,
	type AiStyle,
	type AiUpdateConnectorEntry,
	type AiZOrderPlacement,
	isAiDocOp,
	MAX_DESCRIBE_CHARS,
	MAX_SUMMARY_CHARS,
	MAX_SVG_CHARS,
} from "./canvasOps";
export {
	type CanvasToolArgs,
	type CanvasToolDescriptor,
	createCanvasToolDescriptors,
} from "./canvasTools";
export {
	type AiCanvasCapabilities,
	toCanvasCapabilities,
} from "./capabilities";
