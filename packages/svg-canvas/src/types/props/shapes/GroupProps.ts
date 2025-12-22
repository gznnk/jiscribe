import type { CreateDiagramProps } from "./CreateDiagramProps";
import type { GroupFeatures } from "../../data/shapes/GroupData";
import type { DiagramConnectEvent } from "../../events/DiagramConnectEvent";
import type { DiagramTextChangeEvent } from "../../events/DiagramTextChangeEvent";
import type { ExecuteEvent } from "../../events/ExecuteEvent";
import type { PreviewConnectLineEvent } from "../../events/PreviewConnectLineEvent";
import type { GroupState } from "../../state/shapes/GroupState";

/**
 * Props for Group component.
 */
export type GroupProps = CreateDiagramProps<
	GroupState,
	typeof GroupFeatures
> & {
	onConnect?: (e: DiagramConnectEvent) => void;
	onPreviewConnectLine?: (e: PreviewConnectLineEvent) => void;
	onTextChange?: (e: DiagramTextChangeEvent) => void;
	onExecute?: (e: ExecuteEvent) => void;
};
