import type { FrameFeatures } from "../../data/elements/FrameData";
import type { ExecutionPropagationEvent } from "../../events/ExecutionPropagationEvent";
import type { FrameState } from "../../state/elements/FrameState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Props for Frame component
 */
export type FrameProps = CreateDiagramProps<
	FrameState,
	typeof FrameFeatures
> & {
	children?: React.ReactNode;
	onPropagation?: (e: ExecutionPropagationEvent) => void;
};
