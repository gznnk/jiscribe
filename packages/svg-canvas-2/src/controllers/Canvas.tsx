import type { Dimensions } from "@workspace/geometry";
import {
	memo,
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
} from "react";

import {
	Container,
	ScrollSyncedOverlay,
	Viewport,
	ViewportOverlay,
	ZoomScaledOverlay,
} from "./CanvasStyled";
import type { GestureCallback } from "./gestures/recognizer/GestureRecognizerTypes";
import { useHistory } from "./history/useHistory";
import { useContainerSize } from "./hooks/useContainerSize";
import { useDocumentWheel } from "./hooks/useDocumentWheel";
import { useGestureRecognizer } from "./hooks/useGestureRecognizer";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { canvasReducer } from "./reducer/canvasReducer";
import { initializeRegistries } from "./setup";
import { CanvasView } from "../presentations/CanvasView";
import { TransformControlsLayer } from "./ui/controls/TransformControlsLayer";
import { VertexControlsLayer } from "./ui/controls/VertexControlsLayer";
import { DebugInfo } from "./ui/debug/DebugInfo";
import { TextEditorLayer } from "./ui/editors/TextEditorLayer";
import { AreaSelectionRect } from "./ui/feedback/AreaSelectionRect";
import { DragGhost } from "./ui/feedback/DragGhost";
import { SelectionOverlay } from "./ui/feedback/SelectionOverlay";
import { ContextMenu } from "./ui/menu/ContextMenu";
import { ObjectMenu } from "./ui/menu/ObjectMenu";
import { ShapeLibrary } from "./ui/menu/ShapeLibrary";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import { canvasToDoc, canvasToState } from "../states/canvas/CanvasMapper";
import type { CanvasState } from "../states/canvas/CanvasState";

// Initialize all registries (ObjectRegistry, GestureHandlerRegistry)
initializeRegistries();

type CanvasProps = {
	canvasDoc: CanvasDoc;
	/**
	 * Callback invoked when a committable action occurs (e.g., dragEnd, click).
	 * Use this to persist or sync the canvas state to external storage.
	 */
	onCommit?: (doc: CanvasDoc) => void;
};

const CanvasComponent: React.FC<CanvasProps> = ({ canvasDoc, onCommit }) => {
	const canvasRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);

	const initialState = useMemo((): CanvasState => {
		const baseState = canvasToState(canvasDoc);
		return {
			...baseState,
			selectedIds: [],
			hoveredIds: [],
			eventStartState: null,
			lastCommitTime: 0,
			contextMenuPosition: null,
			pendingShapeType: null,
			ghostPosition: null,
			areaSelection: null,
			objectMenuOpenId: null,
			textEditState: null,
		};
	}, [canvasDoc]);

	// Reducer for canvas state management
	const [state, dispatch] = useReducer(canvasReducer, initialState);

	// 履歴管理
	const { history, record, undo, redo, replace, canUndo, canRedo } =
		useHistory(canvasDoc);

	// console.log("[Canvas] Render", { state });

	// Notify parent component when a committable action occurs
	useEffect(() => {
		if (state.lastCommitTime > 0) {
			const doc = canvasToDoc(state);
			onCommit?.(doc);

			// 履歴に記録（Undo/Redo実行中は内部で自動スキップされる）
			record(doc);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.lastCommitTime, onCommit, record]);

	// Sync external canvasDoc changes
	useEffect(() => {
		const newState = canvasToState(canvasDoc);
		dispatch({ type: "SYNC_EXTERNAL", payload: newState });

		// 履歴のpresentも置き換え
		replace(canvasDoc);
	}, [canvasDoc, replace]);

	// Gesture handling
	const handleGesture = useCallback<GestureCallback>(
		(gesture) => {
			dispatch({ type: "GESTURE", gesture });
		},
		[dispatch],
	);
	const { pointerHandlers, wheelHandler } = useGestureRecognizer({
		gestureCallback: handleGesture,
		containerRef: canvasRef,
		svgRef,
		canvasState: state,
	});

	// Use wheel handler from GestureRecognizer
	useDocumentWheel(svgRef, wheelHandler);

	// Container resize handling
	const handleResize = useCallback(
		(dimensions: Dimensions) => {
			dispatch({ type: "CONTAINER_RESIZE", dimensions });
		},
		[dispatch],
	);
	useContainerSize(canvasRef, handleResize);

	// カスタムコマンドハンドラ（Undo/Redoを処理）
	const handleCommand = useCallback(
		(commandId: string) => {
			if (commandId === "undo") {
				if (canUndo) {
					const doc = history.past[history.past.length - 1];
					dispatch({ type: "UNDO", doc });
					undo(); // 内部でフラグ管理される
				}
				return;
			}

			if (commandId === "redo") {
				if (canRedo) {
					const doc = history.future[0];
					dispatch({ type: "REDO", doc });
					redo(); // 内部でフラグ管理される
				}
				return;
			}

			// 通常のコマンドは既存のロジックへ
			dispatch({ type: "COMMAND", commandId });
		},
		[canUndo, canRedo, history, undo, redo, dispatch],
	);

	// Keyboard shortcuts handling
	useKeyboardShortcuts(state, handleCommand);

	// Context menu handling
	const handleContextMenu = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			e.preventDefault();
		},
		[],
	);

	const { minX, minY, zoom } = state.viewport;

	return (
		<Viewport
			data-id="canvas"
			data-kind="canvas"
			ref={canvasRef}
			onContextMenu={handleContextMenu}
			{...pointerHandlers}
		>
			<Container>
				<CanvasView
					objects={state.objects}
					rootIds={state.rootIds}
					connectorIds={state.connectorIds}
					viewport={state.viewport}
					svgRef={svgRef}
					textEditObjectId={state.textEditState?.objectId ?? null}
				>
					<SelectionOverlay
						selectedIds={state.selectedIds}
						objects={state.objects}
					/>
					<TransformControlsLayer
						selectedIds={state.selectedIds}
						objects={state.objects}
						multiSelectGroup={state.multiSelectGroup}
						zoom={state.viewport.zoom}
					/>
					<VertexControlsLayer
						selectedIds={state.selectedIds}
						objects={state.objects}
						zoom={state.viewport.zoom}
					/>
					<DragGhost
						pendingShapeType={state.pendingShapeType}
						ghostPosition={state.ghostPosition}
					/>
					<AreaSelectionRect areaSelection={state.areaSelection} />
				</CanvasView>
				{/* Container for HTML elements that follow canvas scroll AND zoom (elements scale with zoom) */}
				<ZoomScaledOverlay left={-minX} top={-minY} zoom={zoom}>
					<TextEditorLayer
						textEditState={state.textEditState}
						objects={state.objects}
						onTextChange={(text) => dispatch({ type: "UPDATE_TEXT_EDIT", text })}
						onEscape={() => dispatch({ type: "END_TEXT_EDIT", commit: false })}
					/>
				</ZoomScaledOverlay>
				{/* Container for HTML elements with fixed size (position follows zoom, but size does not) */}
				<ScrollSyncedOverlay left={-minX} top={-minY} zoom={zoom}>
					<ObjectMenu canvasState={state} />
				</ScrollSyncedOverlay>
			</Container>
			<ViewportOverlay>
				<ShapeLibrary />
				<DebugInfo selectedIds={state.selectedIds} objects={state.objects} />
				<ContextMenu position={state.contextMenuPosition} canvasState={state} />
			</ViewportOverlay>
		</Viewport>
	);
};
export const Canvas = memo(CanvasComponent);
