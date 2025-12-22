import { diagramDataListToDiagramList } from "./diagramDataListToDiagramList";
import type { TextEditorState } from "../../components/core/Textable";
import type { Diagram } from "../../types/state/core/Diagram";
import { deepCopy } from "../../utils/core/deepCopy";
import { InteractionState } from "../types/InteractionState";
import type { SvgCanvasData } from "../types/SvgCanvasData";
import type { SvgCanvasState } from "../types/SvgCanvasState";

/**
 * Converts SvgCanvasData to SvgCanvasState
 */
export const canvasDataToState = (
	data: SvgCanvasData,
): Omit<
	SvgCanvasState,
	"multiSelectGroup" | "previewConnectLineState" | "grabScrollState"
> => {
	const stateItems: Diagram[] = diagramDataListToDiagramList(data.items);

	return {
		id: data.id,
		minX: data.minX,
		minY: data.minY,
		zoom: data.zoom,
		items: stateItems,
		selectedDiagramPathIndex: new Map(),
		history: [
			{
				items: deepCopy(stateItems),
			},
		],
		historyIndex: 0,
		lastHistoryEventId: "",
		textEditorState: { isActive: false } as TextEditorState,
		interactionState: InteractionState.Idle,
		suppressContextMenu: false,
		showDragGhost: false,
		areaSelectionState: {
			startX: 0,
			startY: 0,
			endX: 0,
			endY: 0,
		},
	};
};
