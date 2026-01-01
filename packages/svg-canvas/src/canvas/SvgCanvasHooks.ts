import { EventBus } from "@workspace/event-bus";
import { useRef, useState, type RefObject } from "react";

import { useAddDiagramByType } from "./hooks/actions/useAddDiagramByType";
import { useCopy } from "./hooks/actions/useCopy";
import { useDelete } from "./hooks/actions/useDelete";
import { useExport } from "./hooks/actions/useExport";
import { usePaste } from "./hooks/actions/usePaste";
import { usePreviewConnectLine } from "./hooks/actions/usePreviewConnectLine";
import { useSuppressContextMenu } from "./hooks/control/useSuppressContextMenu";
import { useOnAddDiagram } from "./hooks/diagram/useOnAddDiagram";
import { useOnAppendDiagrams } from "./hooks/diagram/useOnAppendDiagrams";
import { useOnClick } from "./hooks/diagram/useOnClick";
import { useOnConnect } from "./hooks/diagram/useOnConnect";
import { useOnDiagramChange } from "./hooks/diagram/useOnDiagramChange";
import { useOnDiagramUpdate } from "./hooks/diagram/useOnDiagramUpdate";
import { useOnDrag } from "./hooks/diagram/useOnDrag";
import { useOnDragLeave } from "./hooks/diagram/useOnDragLeave";
import { useOnDragOver } from "./hooks/diagram/useOnDragOver";
import { useOnExecute } from "./hooks/diagram/useOnExecute";
import { useOnExtractDiagramsToTopLevel } from "./hooks/diagram/useOnExtractDiagramsToTopLevel";
import { useOnGroup } from "./hooks/diagram/useOnGroup";
import { useOnHoverChange } from "./hooks/diagram/useOnHoverChange";
import { useOnKeepProportionChange } from "./hooks/diagram/useOnKeepProportionChange";
import { useOnSelect } from "./hooks/diagram/useOnSelect";
import { useOnStackOrderChange } from "./hooks/diagram/useOnStackOrderChange";
import { useOnTextChange } from "./hooks/diagram/useOnTextChange";
import { useOnTransform } from "./hooks/diagram/useOnTransform";
import { useOnUngroup } from "./hooks/diagram/useOnUngroup";
import { useRedo } from "./hooks/history/useRedo";
import { useUndo } from "./hooks/history/useUndo";
import { useCtrl } from "./hooks/keyboard/useCtrl";
import { useGrabScroll } from "./hooks/navigation/useGrabScroll";
import { useNavigate } from "./hooks/navigation/useNavigate";
import { useZoom } from "./hooks/navigation/useZoom";
import { useAreaSelection } from "./hooks/selection/useAreaSelection";
import { useClearAllSelection } from "./hooks/selection/useClearAllSelection";
import { useSelectAll } from "./hooks/selection/useSelectAll";
import { useOnConnectShapes } from "./hooks/tools/useOnConnectShapes";
import { useOnGroupShapes } from "./hooks/tools/useOnGroupShapes";
import type { SvgCanvasData } from "./types/SvgCanvasData";
import type { SvgCanvasPanZoom } from "./types/SvgCanvasPanZoom";
import type { SvgCanvasRef } from "./types/SvgCanvasRef";
import type { SvgCanvasState } from "./types/SvgCanvasState";
import type { SvgCanvasSubHooksProps } from "./types/SvgCanvasSubHooksProps";
import { canvasDataToState } from "./utils/canvasDataToState";
import type { DiagramData } from "../types/data/core/DiagramData";

/**
 * Props for the useSvgCanvas hook.
 */
type SvgCanvasHooksProps = {
	id: string;
	minX: number;
	minY: number;
	items: DiagramData[];
	zoom: number;
	canvasRef: RefObject<SvgCanvasRef | null>;
	onDataChange?: (data: SvgCanvasData) => void;
	onPanZoomChange?: (pz: SvgCanvasPanZoom) => void;
};

/**
 * The SvgCanvas state and functions.
 *
 * @param props - Initial properties for the SVG canvas
 * @returns The state, props and functions of the SvgCanvas
 */
export const useSvgCanvas = (props: SvgCanvasHooksProps) => {
	// Create EventBus instance for canvas-wide event communication
	const eventBusRef = useRef(new EventBus());

	// The state of the canvas.
	const [canvasState, setCanvasState] = useState<SvgCanvasState>(() => {
		const initialData: SvgCanvasData = {
			id: props.id,
			minX: props.minX,
			minY: props.minY,
			zoom: props.zoom,
			items: props.items,
		};
		return canvasDataToState(initialData);
	});

	// Create props for the canvas hooks.
	const canvasHooksProps: SvgCanvasSubHooksProps = {
		canvasState,
		eventBus: eventBusRef.current,
		canvasRef: props.canvasRef.current,
		setCanvasState,
		onDataChange: props.onDataChange,
		onPanZoomChange: props.onPanZoomChange,
	};

	// keyboard
	// Ctrl key state management
	const { isCtrlPressed } = useCtrl();

	// actions
	// Handler for the new diagram event.
	const onAddDiagramByType = useAddDiagramByType(canvasHooksProps);

	// Handler for the copy event.
	const onCopy = useCopy(canvasHooksProps);

	// Handler for the delete event.
	const onDelete = useDelete(canvasHooksProps);

	// Handler for the export event.
	const onExport = useExport(canvasHooksProps);

	// Handler for the paste event.
	const onPaste = usePaste(canvasHooksProps);

	// Handler for the preview connect line event.
	const onPreviewConnectLine = usePreviewConnectLine(canvasHooksProps);

	// diagram
	// Hooks for the add diagram tool.
	useOnAddDiagram(canvasHooksProps);

	// Hook for appending diagrams via D&D.
	useOnAppendDiagrams(canvasHooksProps);

	// Hook for the diagram update event.
	useOnDiagramUpdate(canvasHooksProps);

	// Hook for the stack order change event.
	useOnStackOrderChange(canvasHooksProps);

	// Hook for the keep proportion change event.
	useOnKeepProportionChange(canvasHooksProps);

	// Hook for the group event.
	useOnGroup(canvasHooksProps);

	// Hook for the ungroup event.
	useOnUngroup(canvasHooksProps);

	// Hook for extracting selected diagrams to top level when dragged out of CanvasFrame.
	useOnExtractDiagramsToTopLevel(canvasHooksProps);

	// Handler for the click event.
	const onClick = useOnClick(canvasHooksProps, isCtrlPressed);

	// Handler for the diagram connect event.
	const onConnect = useOnConnect(canvasHooksProps);

	// Handler for the diagram change event.
	const onDiagramChange = useOnDiagramChange(canvasHooksProps);

	// Handler for the drag event.
	const onDrag = useOnDrag(canvasHooksProps);

	// Handler for the drag leave event.
	const onDragLeave = useOnDragLeave(canvasHooksProps);

	// Handler for the drag over event.
	const onDragOver = useOnDragOver(canvasHooksProps);

	// Handler for the execute event.
	const onExecute = useOnExecute(canvasHooksProps);

	// Handler for the hover change event.
	const onHoverChange = useOnHoverChange(canvasHooksProps);

	// Handler for the select event.
	const onSelect = useOnSelect(canvasHooksProps, isCtrlPressed);

	// Handler for the text change event (includes text editing initiation).
	const onTextChange = useOnTextChange(canvasHooksProps);

	// Handler for the transfrom event.
	const onTransform = useOnTransform(canvasHooksProps);

	// history
	// Handler for the redo event.
	const onRedo = useRedo(canvasHooksProps);

	// Handler for the undo event.
	const onUndo = useUndo(canvasHooksProps);

	// navigation
	// Use grab scroll hook for Ctrl+drag functionality
	const { onGrabStart, onGrabMove, onGrabEnd } =
		useGrabScroll(canvasHooksProps);

	// Handler for the navigate event
	const onNavigate = useNavigate(canvasHooksProps);

	// Handler for the zoom event.
	const onZoom = useZoom(canvasHooksProps);

	// selection
	// Handler for area selection
	const { selectionState, onAreaSelection, onCancelAreaSelection } =
		useAreaSelection(canvasHooksProps);

	// Handler for the clear all selection event.
	const onClearAllSelection = useClearAllSelection(canvasHooksProps);

	// Handler for the select all event.
	const onSelectAll = useSelectAll(canvasHooksProps);

	// context menu
	// Handler for changing suppressContextMenu state
	const onSuppressContextMenuChange = useSuppressContextMenu(canvasHooksProps);

	// tools
	// Hook for the connect shapes tool.
	useOnConnectShapes(canvasHooksProps);
	// Hook for the group shapes tool.
	useOnGroupShapes(canvasHooksProps);

	// Create the canvas props object that will be passed to the SvgCanvas component.
	const canvasProps = {
		...canvasState,
		eventBus: eventBusRef.current,
		selectionState,
		// actions
		onClick,
		onConnect,
		onCopy,
		onDelete,
		onDiagramChange,
		onDrag,
		onDragOver,
		onDragLeave,
		onExecute,
		onExport,
		onHoverChange,
		onAddDiagramByType,
		onPaste,
		onPreviewConnectLine,
		onTextChange,
		onTransform,
		// history
		onRedo,
		onUndo,
		// navigation
		onGrabStart,
		onGrabMove,
		onGrabEnd,
		onNavigate,
		onZoom,
		// selection
		onAreaSelection,
		onCancelAreaSelection,
		onClearAllSelection,
		onSelect,
		onSelectAll,
		// control
		onSuppressContextMenuChange,
	};

	return {
		state: [canvasState, setCanvasState] as const,
		canvasProps,
		loadCanvasData: (data: SvgCanvasData) => {
			setCanvasState(canvasDataToState(data));
		},
	};
};
