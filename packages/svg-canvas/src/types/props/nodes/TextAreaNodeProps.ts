import type { TextAreaNodeFeatures } from "../../data/nodes/TextAreaNodeData";
import type { DiagramTextChangeEvent } from "../../events/DiagramTextChangeEvent";
import type { TextAreaNodeState } from "../../state/nodes/TextAreaNodeState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Type of the TextAreaNode component props.
 */
export type TextAreaNodeProps = CreateDiagramProps<
	TextAreaNodeState,
	typeof TextAreaNodeFeatures,
	{
		onTextChange: (e: DiagramTextChangeEvent) => void;
	}
>;
