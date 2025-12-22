import type { AiFeatures } from "../../data/diagrams/AiData";
import type { AiMessageChangeEvent } from "../../events/AiMessageChangeEvent";
import type { DiagramTextChangeEvent } from "../../events/DiagramTextChangeEvent";
import type { ExecuteEvent } from "../../events/ExecuteEvent";
import type { AiState } from "../../state/diagrams/AiState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Props for Ai component
 */
export type AiProps = CreateDiagramProps<
	AiState,
	typeof AiFeatures,
	{
		onTextChange: (e: DiagramTextChangeEvent) => void;
		onExecute?: (e: ExecuteEvent) => void;
		onAiMessageChange?: (e: AiMessageChangeEvent) => void;
	}
>;
