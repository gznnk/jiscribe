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
	type AiDistributeAxis,
	type AiDocOp,
	type AiFitTarget,
	type AiHandleOp,
	type AiNewObject,
	type AiPoint,
	type AiRouting,
	type AiStyle,
	type AiZOrderPlacement,
	isAiDocOp,
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
