import type { LLMNodeFeatures } from "../../data/nodes/LLMNodeData";
import type { DiagramTextChangeEvent } from "../../events/DiagramTextChangeEvent";
import type { LLMNodeState } from "../../state/nodes/LLMNodeState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Type of the LLM node component props.
 */
export type LLMNodeProps = CreateDiagramProps<
	LLMNodeState,
	typeof LLMNodeFeatures,
	{
		onTextChange: (e: DiagramTextChangeEvent) => void;
	}
>;
