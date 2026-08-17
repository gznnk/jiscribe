// The declaration of the canvas tool set an AI can call, and the derivation that
// fills in which shape types those tools may name. Transport-free: how the tools
// are handed to a model belongs to the host.

export type {
	AiAddObjectParams,
	AiAlignEdge,
	AiArrowType,
	AiCanvasOp,
	AiCanvasOpOutcome,
	AiDistributeAxis,
	AiDocOp,
	AiFitTarget,
	AiNewObject,
	AiPoint,
	AiRouting,
	AiStyle,
	AiViewOp,
	AiZOrderPlacement,
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
