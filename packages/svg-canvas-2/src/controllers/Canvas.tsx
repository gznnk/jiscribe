import type { Dimensions } from "@workspace/geometry";
import {
	memo,
	useCallback,
	useEffect,
	useReducer,
	useRef,
	useState,
} from "react";

import {
	Container,
	ScrollSyncedOverlay,
	Viewport,
	ViewportOverlay,
	ZoomScaledOverlay,
} from "./CanvasStyled";
import type { CanvasControllerState } from "./CanvasTypes";
import { isClipboardData } from "./commands/selection/ClipboardData";
import { CanvasViewportRefContext } from "./contexts/CanvasViewportRefContext";
import type { GestureCallback } from "./gestures/recognizer/GestureRecognizerTypes";
import { useContainerSize } from "./hooks/useContainerSize";
import { useDocumentWheel } from "./hooks/useDocumentWheel";
import { useGestureRecognizer } from "./hooks/useGestureRecognizer";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { usePasteKeyboardShortcut } from "./hooks/usePasteKeyboardShortcut";
import { canvasReducer } from "./reducer/canvasReducer";
import { initializeRegistries } from "./setup";
import { CanvasView } from "../presentations/CanvasView";
import { ConnectionAnchorsLayer } from "./ui/controls/ConnectionAnchorsLayer";
import { ConnectorControlsLayer } from "./ui/controls/ConnectorControlsLayer";
import { TransformControlsLayer } from "./ui/controls/TransformControlsLayer";
import { VertexControlsLayer } from "./ui/controls/VertexControlsLayer";
import { TextEditorLayer } from "./ui/editors/TextEditorLayer";
import { AreaSelectionRect } from "./ui/feedback/AreaSelectionRect";
import { ClipboardErrorToast } from "./ui/feedback/ClipboardErrorToast";
import { DragGhost } from "./ui/feedback/DragGhost";
import { DrawingPreviewOverlay } from "./ui/feedback/DrawingPreviewOverlay";
import { PendingConnectorOverlay } from "./ui/feedback/PendingConnectorOverlay";
import { SelectionOverlay } from "./ui/feedback/SelectionOverlay";
import { SnapGuides } from "./ui/feedback/SnapGuides";
import { ZoomIndicator } from "./ui/feedback/ZoomIndicator";
import { ContextMenu } from "./ui/menu/ContextMenu";
import { ObjectMenu } from "./ui/menu/ObjectMenu";
import { ShapeLibrary } from "./ui/menu/ShapeLibrary";
import { isSameCanvasDocContent } from "./utils/isSameCanvasDocContent";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import { canvasToDoc, canvasToState } from "../states/canvas/CanvasMapper";

// Initialize all registries (ObjectRegistry, GestureHandlerRegistry)
initializeRegistries();

type CanvasProps = {
	canvasDoc: CanvasDoc;
	/**
	 * Nonce from the most recent incoming sync message.
	 * Passed through to SYNC_EXTERNAL so the reducer can detect fold-back saves.
	 */
	syncNonce?: string;
	/**
	 * Callback invoked when a committable action occurs (e.g., dragEnd, click).
	 * Use this to persist or sync the canvas state to external storage.
	 * The second argument is the saveNonce that should be echoed back via syncNonce.
	 */
	onCommit?: (doc: CanvasDoc, saveNonce: string) => void;
	/**
	 * When provided, Ctrl+Z is delegated to this callback instead of Canvas's
	 * internal undo stack. Use this in VSCode to forward undo to the host editor.
	 */
	onUndo?: () => void;
	/**
	 * When provided, Ctrl+Shift+Z / Ctrl+Y is delegated to this callback instead
	 * of Canvas's internal redo stack.
	 */
	onRedo?: () => void;
};

const CanvasComponent: React.FC<CanvasProps> = ({
	canvasDoc,
	syncNonce,
	onCommit,
	onUndo,
	onRedo,
}) => {
	const canvasRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const hasMountedRef = useRef(false);

	// Reducer for canvas state management with history
	const [state, dispatch] = useReducer(
		canvasReducer,
		canvasDoc,
		(initialDoc): CanvasControllerState => {
			const baseState = canvasToState(initialDoc);
			return {
				...baseState,
				selectedIds: [],
				eventStartSnapshot: null,
				keyPointsCache: {},
				snapCandidatesCache: null,
				edgeScrollEnabled: false,
				commitVersion: 0,
				saveVersion: 0,
				saveNonce: "",
				contextMenuPosition: null,
				shapeLibraryDrag: null,
				areaSelection: null,
				objectMenuOpenId: null,
				multiSelectGroup: null,
				textEditState: null,
				pendingConnector: null,
				selectedConnectorId: null,
				selectedVertex: null,
				editingConnectorId: null,
				editingEndpoint: null,
				snapFeedback: null,
				shapeDrawing: null,
				lastDuplicate: null,
				internalClipboard: null,
				history: {
					past: [],
					present: canvasToDoc(baseState),
					future: [],
				},
			};
		},
	);

	// Clipboard write side effect: fired whenever internalClipboard changes (Copy / Cut).
	// Keeping this outside Command.execute preserves the pure-function contract of commands.
	const [clipboardWriteErrorVersion, setClipboardWriteErrorVersion] =
		useState(0);
	useEffect(() => {
		if (!state.internalClipboard) {
			return;
		}
		navigator.clipboard
			.writeText(JSON.stringify(state.internalClipboard))
			.catch(() => {
				setClipboardWriteErrorVersion((v) => v + 1);
			});
	}, [state.internalClipboard]);

	// Gesture handling — declared before the SYNC_EXTERNAL effect so resetGestureState is available
	const handleGesture = useCallback<GestureCallback>(
		(gesture) => {
			dispatch({ type: "GESTURE", gesture });
		},
		[dispatch],
	);
	const { pointerHandlers, wheelHandler, resetGestureState } =
		useGestureRecognizer({
			gestureCallback: handleGesture,
			containerRef: canvasRef,
			svgRef,
			canvasState: state,
		});

	// Always-fresh mirrors of props/state read by the effects below.
	// Reading through refs keeps those effects from depending on the parent
	// keeping onCommit / canvasDoc referentially stable across renders.
	const onCommitRef = useRef(onCommit);
	const stateRef = useRef(state);
	useEffect(() => {
		onCommitRef.current = onCommit;
		stateRef.current = state;
	});

	// Notify parent component when a save is required (after commit or undo/redo).
	// Depends only on saveVersion: the closure captures the state of exactly the
	// render in which saveVersion was bumped, which is the state to persist.
	// onCommit goes through a ref so a parent passing a new function on every
	// render cannot re-fire this effect and resend the same saveNonce.
	useEffect(() => {
		if (state.saveVersion > 0) {
			onCommitRef.current?.(canvasToDoc(state), state.saveNonce);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.saveVersion]);

	// Sync external canvasDoc changes.
	// Skip the first invocation on mount: the initializer already used the same canvasDoc,
	// so dispatching SYNC_EXTERNAL would create a redundant history entry.
	useEffect(() => {
		if (!hasMountedRef.current) {
			hasMountedRef.current = true;
			return;
		}
		// Content-identical doc (e.g. the parent re-created the object, or our own
		// save echoed back): skip entirely. Proceeding would interrupt an
		// in-progress gesture, clear all UI state, and push a redundant history
		// entry even though nothing changed.
		if (isSameCanvasDocContent(canvasDoc, stateRef.current.history.present)) {
			return;
		}
		const newState = canvasToState(canvasDoc);
		resetGestureState();
		dispatch({
			type: "SYNC_EXTERNAL",
			payload: newState,
			saveNonce: syncNonce,
		});
	}, [canvasDoc, resetGestureState, syncNonce]);

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

	// Keyboard shortcuts handling
	const handleCommand = useCallback(
		(commandId: string) => {
			dispatch({ type: "COMMAND", commandId });
		},
		[dispatch],
	);

	useKeyboardShortcuts(state, handleCommand, onUndo, onRedo);

	const handlePasteCallback = useCallback(async () => {
		let data = null;
		try {
			const text = await navigator.clipboard.readText();
			const parsed: unknown = JSON.parse(text);
			if (isClipboardData(parsed)) {
				data = parsed;
			}
		} catch {
			// clipboard read failure or parse error
		}
		data ??= state.internalClipboard;
		if (!data) {
			return;
		}
		dispatch({ type: "PASTE", data });
	}, [dispatch, state.internalClipboard]);
	usePasteKeyboardShortcut(handlePasteCallback);

	const handleMenuPropertyUpdate = useCallback(
		(property: string, value: string, commit: boolean) => {
			dispatch({ type: "MENU_PROPERTY_UPDATE", property, value, commit });
		},
		[dispatch],
	);

	// Context menu handling
	const handleContextMenu = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			e.preventDefault();
		},
		[],
	);

	const { minX, minY, zoom } = state.viewport;

	return (
		<CanvasViewportRefContext value={canvasRef}>
			<Viewport
				data-id="canvas"
				data-kind="canvas"
				ref={canvasRef}
				onContextMenu={handleContextMenu}
				cursor={state.shapeDrawing ? "crosshair" : undefined}
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
						isDrawMode={!!state.shapeDrawing}
					>
						<PendingConnectorOverlay
							pendingConnector={state.pendingConnector}
							objects={state.objects}
						/>
						<SelectionOverlay
							selectedIds={state.selectedIds}
							objects={state.objects}
							multiSelectGroup={state.multiSelectGroup}
						/>
						<ConnectorControlsLayer
							selectedConnectorId={state.selectedConnectorId}
							objects={state.objects}
							zoom={state.viewport.zoom}
						/>
						<TransformControlsLayer
							selectedIds={state.selectedIds}
							objects={state.objects}
							multiSelectGroup={state.multiSelectGroup}
							zoom={state.viewport.zoom}
							isTextEditing={!!state.textEditState}
						/>
						<ConnectionAnchorsLayer
							selectedIds={state.selectedIds}
							objects={state.objects}
							zoom={state.viewport.zoom}
							pendingConnector={state.pendingConnector}
							editingEndpoint={state.editingEndpoint}
							isTextEditing={!!state.textEditState}
						/>
						<VertexControlsLayer
							selectedIds={state.selectedIds}
							objects={state.objects}
							zoom={state.viewport.zoom}
							selectedVertex={state.selectedVertex}
						/>
						<DragGhost shapeLibraryDrag={state.shapeLibraryDrag} />
						<DrawingPreviewOverlay shapeDrawing={state.shapeDrawing} />
						<AreaSelectionRect areaSelection={state.areaSelection} />
						<SnapGuides
							snapFeedback={state.snapFeedback}
							zoom={state.viewport.zoom}
						/>
					</CanvasView>
					{/* Container for HTML elements that follow canvas scroll AND zoom (elements scale with zoom) */}
					<ZoomScaledOverlay left={-minX} top={-minY} zoom={zoom}>
						<TextEditorLayer
							textEditState={state.textEditState}
							objects={state.objects}
							onTextChange={(text) =>
								dispatch({ type: "UPDATE_TEXT_EDIT", text })
							}
							onEscape={() =>
								dispatch({ type: "END_TEXT_EDIT", commit: false })
							}
						/>
					</ZoomScaledOverlay>
					{/* Container for HTML elements with fixed size (position follows zoom, but size does not) */}
					<ScrollSyncedOverlay left={-minX} top={-minY} zoom={zoom}>
						<ObjectMenu
							canvasState={state}
							onPropertyUpdate={handleMenuPropertyUpdate}
						/>
					</ScrollSyncedOverlay>
				</Container>
				<ViewportOverlay>
					<ShapeLibrary
						activePresetId={state.shapeDrawing?.preset.id ?? null}
					/>
					<ZoomIndicator zoom={state.viewport.zoom} />
					<ClipboardErrorToast errorVersion={clipboardWriteErrorVersion} />
					<ContextMenu
						position={state.contextMenuPosition}
						canvasState={state}
						callbacks={{ paste: handlePasteCallback }}
					/>
				</ViewportOverlay>
			</Viewport>
		</CanvasViewportRefContext>
	);
};
export const Canvas = memo(CanvasComponent);
