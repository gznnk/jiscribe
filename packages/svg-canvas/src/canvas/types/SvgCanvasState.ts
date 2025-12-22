import type { Prettify } from "@workspace/utility-types";

import type { AreaSelectionState } from "./AreaSelectionState";
import type { GrabScrollState } from "./GrabScrollState";
import type { InteractionState } from "./InteractionState";
import type { SvgCanvasHistory } from "./SvgCanvasHistory";
import type { SvgCanvasPanZoom } from "./SvgCanvasPanZoom";
import type { TextEditorState } from "../../components/core/Textable";
import type { DiagramPathIndex } from "../../types/core/DiagramPath";
import type { Diagram } from "../../types/state/core/Diagram";
import type { GroupState } from "../../types/state/shapes/GroupState";
import type { PathState } from "../../types/state/shapes/PathState";

/**
 * Type for the state of the SvgCanvas.
 */
export type SvgCanvasState = Prettify<
	SvgCanvasPanZoom & {
		id: string;
		items: Diagram[];
		multiSelectGroup?: GroupState;
		/** Path index for selected diagrams for efficient access */
		selectedDiagramPathIndex: DiagramPathIndex;
		history: SvgCanvasHistory[];
		historyIndex: number;
		lastHistoryEventId: string;
		textEditorState: TextEditorState;
		previewConnectLineState?: PathState;
		grabScrollState?: GrabScrollState;
		interactionState: InteractionState;
		areaSelectionState: AreaSelectionState;
		/** Whether to suppress context menu (e.g., after grab scroll or drag operations) */
		suppressContextMenu: boolean;
		/** Whether to show ghost image for dragged items */
		showDragGhost: boolean;
	}
>;
