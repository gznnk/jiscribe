import type { CanvasFrameFeatures } from "../../data/diagrams/CanvasFrameData";
import type { DiagramConnectEvent } from "../../events/DiagramConnectEvent";
import type { DiagramTextChangeEvent } from "../../events/DiagramTextChangeEvent";
import type { ExecuteEvent } from "../../events/ExecuteEvent";
import type { PreviewConnectLineEvent } from "../../events/PreviewConnectLineEvent";
import type { CanvasFrameState } from "../../state/diagrams/CanvasFrameState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Props for CanvasFrame component
 */
export type CanvasFrameProps = CreateDiagramProps<
	CanvasFrameState,
	typeof CanvasFrameFeatures
> & {
	onConnect?: (e: DiagramConnectEvent) => void;
	onPreviewConnectLine?: (e: PreviewConnectLineEvent) => void;
	onTextChange?: (e: DiagramTextChangeEvent) => void;
	onExecute?: (e: ExecuteEvent) => void;
};
