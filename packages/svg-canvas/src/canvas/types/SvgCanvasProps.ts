import type { EventBus } from "@workspace/event-bus";

import type { AreaSelectionState } from "./AreaSelectionState";
import type { SvgCanvasData } from "./SvgCanvasData";
import type { SvgCanvasState } from "./SvgCanvasState";
import type { AddDiagramByTypeEvent } from "../../types/events/AddDiagramByTypeEvent";
import type { AreaSelectionEvent } from "../../types/events/AreaSelectionEvent";
import type { DiagramChangeEvent } from "../../types/events/DiagramChangeEvent";
import type { DiagramClickEvent } from "../../types/events/DiagramClickEvent";
import type { DiagramConnectEvent } from "../../types/events/DiagramConnectEvent";
import type { DiagramDragDropEvent } from "../../types/events/DiagramDragDropEvent";
import type { DiagramDragEvent } from "../../types/events/DiagramDragEvent";
import type { DiagramHoverChangeEvent } from "../../types/events/DiagramHoverChangeEvent";
import type { DiagramSelectEvent } from "../../types/events/DiagramSelectEvent";
import type { DiagramTextChangeEvent } from "../../types/events/DiagramTextChangeEvent";
import type { DiagramTransformEvent } from "../../types/events/DiagramTransformEvent";
import type { ExecuteEvent } from "../../types/events/ExecuteEvent";
import type { PreviewConnectLineEvent } from "../../types/events/PreviewConnectLineEvent";
import type { SvgCanvasResizeEvent } from "../../types/events/SvgCanvasResizeEvent";

/**
 * Props for the SvgCanvas component.
 */
export type SvgCanvasProps = SvgCanvasState & {
	eventBus: EventBus;
	title?: string;
	selectionState?: AreaSelectionState;
	// actions
	onClick?: (e: DiagramClickEvent) => void;
	onConnect?: (e: DiagramConnectEvent) => void;
	onCopy?: () => void;
	onDelete?: () => void;
	onDiagramChange?: (e: DiagramChangeEvent) => void;
	onDrag?: (e: DiagramDragEvent) => void;
	onDragLeave?: (e: DiagramDragDropEvent) => void;
	onDragOver?: (e: DiagramDragDropEvent) => void;
	onExecute?: (e: ExecuteEvent) => void;
	onExport?: () => void;
	onHoverChange?: (e: DiagramHoverChangeEvent) => void;
	onAddDiagramByType?: (e: AddDiagramByTypeEvent) => void;
	onPaste?: () => void;
	onPreviewConnectLine?: (e: PreviewConnectLineEvent) => void;
	onTextChange?: (e: DiagramTextChangeEvent) => void;
	onTransform?: (e: DiagramTransformEvent) => void;
	// history
	onRedo?: () => void;
	onUndo?: () => void;
	// navigation
	onGrabStart?: (e: React.PointerEvent<SVGSVGElement>) => boolean;
	onGrabMove?: (e: React.PointerEvent<SVGSVGElement>) => void;
	onGrabEnd?: (e: React.PointerEvent<SVGSVGElement>) => void;
	onNavigate?: (minX: number, minY: number) => void;
	onZoom?: (
		zoom: number,
		options?: { clientX?: number; clientY?: number },
	) => void;
	// selection
	onAreaSelection?: (event: AreaSelectionEvent) => void;
	onCancelAreaSelection?: () => void;
	onClearAllSelection?: () => void;
	onSelect?: (e: DiagramSelectEvent) => void;
	onSelectAll?: () => void;
	// control
	onSuppressContextMenuChange?: (suppress: boolean) => void;
	// other
	onDataChange?: (data: SvgCanvasData) => void;
	onCanvasResize?: (e: SvgCanvasResizeEvent) => void;
};
