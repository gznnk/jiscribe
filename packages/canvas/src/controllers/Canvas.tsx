import { memo, useCallback, useRef } from "react";

import {
	CanvasRoot,
	Container,
	ScrollSyncedOverlay,
	Viewport,
	ViewportOverlay,
	ZoomScaledOverlay,
} from "./CanvasStyled";
import { commandRegistry } from "./commands/CommandRegistry";
import { CanvasViewportRefContext } from "./contexts/CanvasViewportRefContext";
import { isGestureOptedOut } from "./gestures/recognizer/utils/isGestureOptedOut";
import { useCanvasReducer } from "./hooks/useCanvasReducer";
import { useCanvasWheel } from "./hooks/useCanvasWheel";
import { useClipboardPaste } from "./hooks/useClipboardPaste";
import { useClipboardWrite } from "./hooks/useClipboardWrite";
import { useContainerResize } from "./hooks/useContainerResize";
import { useGestureRecognizer } from "./hooks/useGestureRecognizer";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useNotifySaveRequest } from "./hooks/useNotifySaveRequest";
import { useSyncExternalDoc } from "./hooks/useSyncExternalDoc";
import { initializeRegistries } from "./setup";
import { CanvasView } from "../presentations/CanvasView";
import { ConnectionAnchorsLayer } from "./ui/controls/ConnectionAnchorsLayer";
import { ConnectorControlsLayer } from "./ui/controls/ConnectorControlsLayer";
import { TransformControlsLayer } from "./ui/controls/TransformControlsLayer";
import { VertexControlsLayer } from "./ui/controls/VertexControlsLayer";
import { TextEditorLayer } from "./ui/editors/TextEditorLayer";
import { AreaSelectionRect } from "./ui/feedback/AreaSelectionRect";
import { AxisLockGuide } from "./ui/feedback/AxisLockGuide";
import { ClipboardErrorToast } from "./ui/feedback/ClipboardErrorToast";
import { DragGhost } from "./ui/feedback/DragGhost";
import { DrawingPreviewOverlay } from "./ui/feedback/DrawingPreviewOverlay";
import { PendingConnectorOverlay } from "./ui/feedback/PendingConnectorOverlay";
import { SelectionOverlay } from "./ui/feedback/SelectionOverlay";
import { SnapGuides } from "./ui/feedback/SnapGuides";
import { ContextMenu } from "./ui/menu/ContextMenu";
import { ObjectMenu } from "./ui/menu/ObjectMenu";
import { Toolbar } from "./ui/menu/Toolbar";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";

// Initialize all registries (ObjectRegistry, GestureHandlerRegistry)
initializeRegistries();

type CanvasProps = {
	/**
	 * 表示する CanvasDoc。
	 *
	 * **呼び出し側の責務**: 必ず `parseCanvasText`（二段検証）を通した正当な doc を
	 * 渡すこと。Canvas は内部で再検証せず、ID 一意・参照整合・非循環を前提に動作する。
	 * 未検証の doc（壊れた参照や循環を含む）を渡すと内部走査がハングしうる。
	 * 検証は外部入力の境界（host）で行う方針
	 * → packages/canvas/docs/01-design-philosophy.md 原則4。
	 */
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
	// rootRef: ジェスチャー面（ツールバー＋キャンバス領域）。pointerHandlers と
	// pointer capture を張る。canvasRef: キャンバス領域のみ。寸法計測・wheel・
	// メニュー境界に使い、エッジスクロールをツールバー下の領域に揃える。
	const rootRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);

	// Reducer for canvas state management with history
	const [state, dispatch] = useCanvasReducer(canvasDoc);

	// Clipboard write side effect: fired whenever internalClipboard changes (Copy / Cut)
	const clipboardWriteErrorVersion = useClipboardWrite(state.internalClipboard);

	// Gesture handling — declared before useSyncExternalDoc so resetGestureState is available
	const { pointerHandlers, wheelHandler, resetGestureState } =
		useGestureRecognizer({
			dispatch,
			containerRef: rootRef,
			svgRef,
			canvasState: state,
		});

	// Notify parent component when a save is required (after commit or undo/redo)
	useNotifySaveRequest(state, onCommit);

	// Sync external canvasDoc changes
	useSyncExternalDoc({
		canvasDoc,
		syncNonce,
		canvasState: state,
		dispatch,
		resetGestureState,
	});

	// Use wheel handler from GestureRecognizer.
	// canvasRef（コンテナ要素）にスコープし、キャンバス外の wheel は奪わない。
	useCanvasWheel(canvasRef, wheelHandler);

	// Container resize handling
	useContainerResize(canvasRef, dispatch);

	// Keyboard shortcuts handling
	useKeyboardShortcuts({ canvasState: state, dispatch, onUndo, onRedo });

	// Paste handling (keyboard shortcut + context menu)
	const handlePaste = useClipboardPaste(state.internalClipboard, dispatch);

	const handleMenuPropertyUpdate = useCallback(
		(property: string, value: string, commit: boolean) => {
			dispatch({ type: "MENU_PROPERTY_UPDATE", property, value, commit });
		},
		[dispatch],
	);

	// Context menu handling
	const handleContextMenu = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			// data-gesture="none" の要素（テキスト編集中の textarea など）では
			// ブラウザ標準のコンテキストメニューを表示する
			if (isGestureOptedOut(e.target)) {
				return;
			}
			e.preventDefault();
		},
		[],
	);

	const { minX, minY, zoom } = state.viewport;

	// ズームボタンの有効/無効はコマンドの canExecute に委譲（単一の真実）。
	const canZoomIn = commandRegistry.get("zoomIn")?.canExecute(state) ?? false;
	const canZoomOut = commandRegistry.get("zoomOut")?.canExecute(state) ?? false;

	return (
		<CanvasViewportRefContext value={canvasRef}>
			<CanvasRoot
				ref={rootRef}
				onContextMenu={handleContextMenu}
				{...pointerHandlers}
			>
				<Toolbar
					activePresetId={state.shapeDrawing?.preset.id ?? null}
					zoom={state.viewport.zoom}
					canZoomIn={canZoomIn}
					canZoomOut={canZoomOut}
				/>
				<Viewport
					data-id="canvas"
					data-kind="canvas"
					ref={canvasRef}
					cursor={state.shapeDrawing ? "crosshair" : undefined}
				>
					<Container>
						<CanvasView
							objects={state.objects}
							rootIds={state.rootIds}
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
								selectedVertex={state.selectedVertex}
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
								editingConnectorId={state.editingConnectorId}
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
							<AxisLockGuide
								axisLockFeedback={state.axisLockFeedback}
								viewport={state.viewport}
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
						<ClipboardErrorToast errorVersion={clipboardWriteErrorVersion} />
						<ContextMenu
							position={state.contextMenuPosition}
							canvasState={state}
							callbacks={{ paste: handlePaste }}
						/>
					</ViewportOverlay>
				</Viewport>
			</CanvasRoot>
		</CanvasViewportRefContext>
	);
};
export const Canvas = memo(CanvasComponent);
