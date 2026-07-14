import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
	CanvasRoot,
	Container,
	ScrollSyncedOverlay,
	Viewport,
	ViewportOverlay,
	ZoomScaledOverlay,
} from "./CanvasStyled";
import { CanvasRegistriesContext } from "./contexts/CanvasRegistriesContext";
import { CanvasViewportRefContext } from "./contexts/CanvasViewportRefContext";
import { isGestureOptedOut } from "./gestures/recognizer/utils/isGestureOptedOut";
import { useCanvasExport, EXPORT_FIT_PADDING } from "./hooks/useCanvasExport";
import type {
	CanvasExportHandle,
	CanvasExportImagePayload,
} from "./hooks/useCanvasExport";
import { useCanvasFocusScope } from "./hooks/useCanvasFocusScope";
import { useCanvasReducer } from "./hooks/useCanvasReducer";
import { useCanvasWheel } from "./hooks/useCanvasWheel";
import { useClipboardPaste } from "./hooks/useClipboardPaste";
import { useClipboardWrite } from "./hooks/useClipboardWrite";
import { resolveCommandState } from "./hooks/useCommandState";
import { useContainerResize } from "./hooks/useContainerResize";
import { useErrorNotification } from "./hooks/useErrorNotification";
import { useGestureRecognizer } from "./hooks/useGestureRecognizer";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useNotifySaveRequest } from "./hooks/useNotifySaveRequest";
import { useNotifySelectionChange } from "./hooks/useNotifySelectionChange";
import { useNotifyViewportChange } from "./hooks/useNotifyViewportChange";
import { useSelfSaveNonceTracker } from "./hooks/useSelfSaveNonceTracker";
import { useSyncExternalDoc } from "./hooks/useSyncExternalDoc";
import type { CanvasViewportHandle } from "./hooks/useViewportHandle";
import { useViewportHandle } from "./hooks/useViewportHandle";
import { mergeCanvasMessages } from "./messages/CanvasMessages";
import type { CanvasMessages } from "./messages/CanvasMessages";
import { CanvasMessagesContext } from "./messages/CanvasMessagesContext";
import { createCanvasRegistries, defaultCanvasRegistries } from "./setup";
import type { CanvasConfig } from "./setup";
import { CanvasView } from "../presentations/CanvasView";
import type { CanvasTheme } from "../theme/CanvasTheme";
import { CanvasThemeContext } from "../theme/CanvasThemeContext";
import { buildThemeCssVars } from "../theme/themeCssVars";
import { darkCanvasTheme } from "../theme/themePresets";
import { ConnectionAnchorsLayer } from "./ui/controls/ConnectionAnchorsLayer";
import { ConnectorControlsLayer } from "./ui/controls/ConnectorControlsLayer";
import { TransformControlsLayer } from "./ui/controls/TransformControlsLayer";
import { VertexControlsLayer } from "./ui/controls/VertexControlsLayer";
import { TextEditorLayer } from "./ui/editors/TextEditorLayer";
import { AreaSelectionRect } from "./ui/feedback/AreaSelectionRect";
import { AxisLockGuide } from "./ui/feedback/AxisLockGuide";
import { DragGhost } from "./ui/feedback/DragGhost";
import { DrawingPreviewOverlay } from "./ui/feedback/DrawingPreviewOverlay";
import { ErrorToast } from "./ui/feedback/ErrorToast";
import { PendingConnectorOverlay } from "./ui/feedback/PendingConnectorOverlay";
import { SelectionOverlay } from "./ui/feedback/SelectionOverlay";
import { SnapGuides } from "./ui/feedback/SnapGuides";
import { ContextMenu } from "./ui/menu/ContextMenu";
import { ObjectMenu } from "./ui/menu/ObjectMenu";
import { Toolbar, type ToolbarEntry } from "./ui/menu/Toolbar";
import { ExportDialog } from "./ui/modal/ExportDialog";
import { ObjectComponentRegistryContext } from "../presentations/objects/registry/ObjectComponentRegistryContext";
import { TextRegionRegistryContext } from "../presentations/objects/registry/TextRegionRegistryContext";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { Camera } from "../states/canvas/Viewport";

type CanvasProps = {
	/**
	 * The CanvasDoc to display.
	 *
	 * **Caller responsibility**: always pass a valid doc that has gone through
	 * `parseCanvasText` (two-stage validation). Canvas does not re-validate
	 * internally and assumes unique IDs, referential integrity, and acyclicity.
	 * Passing an unvalidated doc (with broken references or cycles) can hang
	 * internal traversals. Validation is done at the external-input boundary (host)
	 * → see packages/canvas/docs/01-design-philosophy.md principle 4.
	 */
	canvasDoc: CanvasDoc;
	/**
	 * Nonce from the most recent incoming sync message. Matched against the
	 * delivered save nonces so a fold-back of our own save is recognized and
	 * dropped instead of being treated as an external change (see useSyncExternalDoc).
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
	/**
	 * Callback invoked when the selection changes, receiving the new set of
	 * selected IDs (empty when nothing is selected). Shapes and the connector
	 * are mutually exclusive and reported together as one ordered list. Use this
	 * to drive host UI outside the canvas (e.g. an external property panel).
	 */
	onSelectionChange?: (selectedIds: string[]) => void;
	/**
	 * Partial overrides of the UI strings (tooltips, menus, toasts).
	 * Defaults to English; the host decides the language (e.g. a VSCode host
	 * can pass a Japanese dictionary based on `vscode.env.language`).
	 */
	messages?: Partial<CanvasMessages>;
	/**
	 * Theme injected by the host (default: `darkCanvasTheme`). Appearance tokens
	 * are exposed to styles as `--jiscribe-*` CSS custom properties on the
	 * Canvas root; handle dimensions and the default font are distributed via
	 * context. A VSCode host passes tokens holding `var(--vscode-...)` values
	 * to follow the editor theme; other hosts can pass `lightCanvasTheme` or
	 * their own `CanvasTheme`.
	 */
	theme?: CanvasTheme;
	/**
	 * Focus the canvas on mount so keyboard shortcuts work immediately (default true).
	 * Shortcuts are scoped to the focused Canvas; set false when embedding multiple
	 * Canvases (or when the host manages focus) so mounting does not steal focus.
	 */
	autoFocus?: boolean;
	/**
	 * Initial camera (pan + zoom) applied once at mount, so the first paint lands
	 * at the host's view (restore a saved view, …) instead of the doc default.
	 * Read only at mount; later changes are ignored. To move the view after mount,
	 * use `viewportRef.setViewport` — not this prop.
	 */
	defaultViewport?: Camera;
	/**
	 * Invoked when the camera (pan/zoom) changes — on internal gestures and on
	 * `viewportRef.setViewport` (not on container resize). Read-only: use it to
	 * persist or mirror the view. Do **not** feed it back into `defaultViewport`
	 * (mount-only) or drive the view from it — the canvas owns the live camera; a
	 * mirror-back would fight continuous gestures. Push programmatic changes via
	 * `viewportRef` instead.
	 */
	onViewportChange?: (viewport: Camera) => void;
	/**
	 * Receives the imperative viewport API ({@link CanvasViewportHandle}). Use its
	 * `setViewport(camera)` to move pan/zoom programmatically (fit-to-content,
	 * jump-to-node, a scripted intro). Imperative by design so it cannot feed back
	 * into a render loop the way a controlled `viewport` value prop would.
	 */
	viewportRef?: React.Ref<CanvasViewportHandle>;
	/**
	 * Host UI inserted at the left edge of the toolbar (e.g. save/open buttons).
	 * Rendered inside a `data-gesture="none"` container, so plain `onClick` works.
	 */
	toolbarLeading?: React.ReactNode;
	/**
	 * Host UI inserted at the right edge of the toolbar (e.g. a settings button).
	 * Rendered inside a `data-gesture="none"` container, so plain `onClick` works.
	 */
	toolbarTrailing?: React.ReactNode;
	/**
	 * Overrides the top-level arrangement of the shape tools: an ordered mix of
	 * pinned preset buttons and category flyouts (see {@link ToolbarEntry}). Omit
	 * for the default layout (basic primitives + sticky pinned, flowchart /
	 * general / annotation as flyouts).
	 */
	toolbarLayout?: ToolbarEntry[];
	/**
	 * Per-canvas configuration of the available object types, commands, and
	 * registries. Restricts what this canvas can create/handle (plugin-style
	 * extensibility and feature-gating), independently of any other `<Canvas>` on
	 * the page. Omit for the full default set (all shapes and commands).
	 *
	 * **Caller responsibility**: when `objectTypes` is restricted, only pass docs
	 * whose object types remain enabled — otherwise state construction throws
	 * "Mapper not found" (docs/01-design-philosophy.md principle 4).
	 *
	 * Read **once at mount**: the capability set is part of a canvas's identity,
	 * so later `initialConfig` changes are ignored. To reconfigure, remount with a
	 * new React `key` (`<Canvas key={configId} initialConfig={...} />`).
	 */
	initialConfig?: CanvasConfig;
	/**
	 * Receives the imperative export API ({@link CanvasExportHandle}). Use it
	 * when the host needs the exported image programmatically (e.g. writing a
	 * `.jis.png` on save) instead of through the export dialog.
	 */
	exportRef?: React.Ref<CanvasExportHandle>;
	/**
	 * When provided, the export dialog delivers the exported image here instead
	 * of triggering a browser download. Use this when the host owns file saving
	 * (e.g. the VSCode extension writing into the workspace).
	 */
	onExportImage?: (payload: CanvasExportImagePayload) => void;
};

const CanvasComponent: React.FC<CanvasProps> = ({
	canvasDoc,
	syncNonce,
	onCommit,
	onUndo,
	onRedo,
	onSelectionChange,
	messages,
	theme = darkCanvasTheme,
	autoFocus = true,
	defaultViewport,
	onViewportChange,
	viewportRef,
	toolbarLeading,
	toolbarTrailing,
	toolbarLayout,
	initialConfig,
	exportRef,
	onExportImage,
}) => {
	// Merged UI strings (English defaults + host overrides), distributed via context
	const mergedMessages = useMemo(
		() => mergeCanvasMessages(messages),
		[messages],
	);

	// Appearance tokens as --jiscribe-* custom properties, injected on the root
	// so every descendant style resolves the host-injected theme.
	const themeCssVars = useMemo(() => buildThemeCssVars(theme.tokens), [theme]);

	// Theme-derived defaults for newly created objects (read by gesture handlers
	// via state.docDefaults).
	const docDefaults = useMemo(
		() => ({ fontFamily: theme.fontFamily }),
		[theme.fontFamily],
	);

	// rootRef: the gesture surface (toolbar + canvas area). Attaches pointerHandlers
	// and pointer capture. canvasRef: the canvas area only. Used for size measurement,
	// wheel, and menu bounds, aligning edge scrolling to the area below the toolbar.
	const rootRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);

	// Per-canvas registry bundle: a configured set when `initialConfig` is given,
	// otherwise the shared full default. Built once at mount (see the `initialConfig`
	// prop doc); the stable instance is closed over by the reducer (pure tree) and
	// provided via context (React tree), so the two can never desync.
	const [registries] = useState(() =>
		initialConfig
			? createCanvasRegistries(initialConfig)
			: defaultCanvasRegistries,
	);

	// Reducer for canvas state management with history. defaultViewport (if any)
	// seeds the initial viewport so the first paint is already at the host's
	// pan/zoom — see useCanvasReducer for the mount handoff.
	const [state, dispatch] = useCanvasReducer(
		canvasDoc,
		registries,
		docDefaults,
		defaultViewport,
	);

	// Keep the reducer-held docDefaults in sync when the host swaps themes at
	// runtime (the reducer no-ops when the values are unchanged).
	useEffect(() => {
		dispatch({ type: "SET_DOC_DEFAULTS", docDefaults });
	}, [docDefaults, dispatch]);

	// Single error-toast slot shared by all error sources (clipboard, export)
	const { errorNotification, notifyError } = useErrorNotification();

	// Clipboard write side effect: fired whenever internalClipboard changes (Copy / Cut)
	useClipboardWrite(state.internalClipboard, notifyError);

	// Gesture handling — declared before useSyncExternalDoc so resetGestureState is available
	const { pointerHandlers, wheelHandler, resetGestureState } =
		useGestureRecognizer({
			dispatch,
			containerRef: rootRef,
			svgRef,
			canvasState: state,
		});

	// Shared between the save-delivery and external-sync hooks: matches each
	// delivered save against its fold-back so overlapping saves that fold back
	// out of order are still recognized as self-saves (issue #29).
	const selfSaveNonceTracker = useSelfSaveNonceTracker();

	// Notify the host when the selection changes (external UI integration)
	useNotifySelectionChange(
		state.selectedIds,
		state.selectedConnectorId,
		onSelectionChange,
	);

	// Viewport integration: expose an imperative setter for programmatic pan/zoom
	// (viewportRef) and notify the host of camera changes (onViewportChange). The
	// canvas stays authoritative for the live camera — the host reads it out and
	// pushes changes in imperatively, with no controlled value prop that could
	// feed back and fight continuous gestures.
	useViewportHandle(viewportRef, dispatch);
	useNotifyViewportChange(state.viewport, onViewportChange);

	// Notify parent component when a save is required (after commit or undo/redo)
	useNotifySaveRequest(state, onCommit, selfSaveNonceTracker);

	// Sync external canvasDoc changes
	useSyncExternalDoc({
		canvasDoc,
		syncNonce,
		canvasState: state,
		dispatch,
		resetGestureState,
		selfSaveNonceTracker,
	});

	// Use wheel handler from GestureRecognizer.
	// Scoped to canvasRef (the container element) so wheel events outside the canvas are not captured.
	useCanvasWheel(canvasRef, wheelHandler);

	// Container resize handling
	useContainerResize(canvasRef, dispatch);

	// Keyboard shortcuts handling — scoped to the focusable canvas root (rootRef),
	// so with multiple Canvases on a page only the focused one handles shortcuts.
	useKeyboardShortcuts({
		containerRef: rootRef,
		canvasState: state,
		dispatch,
		onUndo,
		onRedo,
	});

	// Paste handling (keyboard shortcut + context menu)
	const handlePaste = useClipboardPaste(
		rootRef,
		state.internalClipboard,
		dispatch,
	);

	// Focus management for the keyboard scope: initial focus (autoFocus) and
	// reclaiming focus when it silently falls to body (focused element unmounted).
	useCanvasFocusScope(rootRef, autoFocus);

	const handleMenuPropertyUpdate = useCallback(
		(property: string, value: string, commit: boolean) => {
			dispatch({ type: "MENU_PROPERTY_UPDATE", property, value, commit });
		},
		[dispatch],
	);

	// Context menu handling
	const handleContextMenu = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			// For data-gesture="none" elements (e.g. the textarea during text editing),
			// show the browser's native context menu.
			if (isGestureOptedOut(e.target)) {
				return;
			}
			e.preventDefault();
		},
		[],
	);

	// Image export: the imperative exportRef API and the export dialog
	const {
		isExportDialogOpen,
		openExportDialog,
		closeExportDialog,
		handleExportSubmit,
	} = useCanvasExport({
		svgRef,
		canvasState: state,
		registries,
		exportRef,
		onExportImage,
		dispatch,
		notifyError,
	});

	const { minX, minY, zoom } = state.viewport;

	// Zoom button enabled/disabled state is delegated to the command's canExecute (single source of truth).
	// Canvas provides the registries context, so it cannot read it back via a hook
	// and uses the pure resolver against its directly-held bundle instead.
	const canZoomIn =
		resolveCommandState(state, registries, "zoomIn")?.enabled ?? false;
	const canZoomOut =
		resolveCommandState(state, registries, "zoomOut")?.enabled ?? false;

	return (
		<CanvasThemeContext value={theme}>
			<CanvasMessagesContext value={mergedMessages}>
				<CanvasRegistriesContext value={registries}>
					<ObjectComponentRegistryContext value={registries.objectComponent}>
						<TextRegionRegistryContext value={registries.textRegion}>
							<CanvasViewportRefContext value={canvasRef}>
								<CanvasRoot
									ref={rootRef}
									tabIndex={0}
									style={themeCssVars}
									onContextMenu={handleContextMenu}
									{...pointerHandlers}
								>
									<Toolbar
										activePresetId={state.shapeDrawing?.preset.id ?? null}
										openCategoryId={state.shapeLibraryOpenCategory}
										zoom={state.viewport.zoom}
										canZoomIn={canZoomIn}
										canZoomOut={canZoomOut}
										layout={toolbarLayout}
										leading={toolbarLeading}
										trailing={toolbarTrailing}
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
												<DragGhost
													shapeLibraryDrag={state.shapeLibraryDrag}
													docDefaults={state.docDefaults}
												/>
												<DrawingPreviewOverlay
													shapeDrawing={state.shapeDrawing}
												/>
												<AreaSelectionRect
													areaSelection={state.areaSelection}
												/>
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
											<ZoomScaledOverlay
												style={{
													left: -minX * zoom,
													top: -minY * zoom,
													transform: `scale(${zoom})`,
												}}
											>
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
											<ScrollSyncedOverlay
												style={{ left: -minX * zoom, top: -minY * zoom }}
											>
												<ObjectMenu
													canvasState={state}
													onPropertyUpdate={handleMenuPropertyUpdate}
												/>
											</ScrollSyncedOverlay>
										</Container>
										<ViewportOverlay>
											<ErrorToast notification={errorNotification} />
											<ContextMenu
												position={state.contextMenuPosition}
												canvasState={state}
												callbacks={{
													paste: handlePaste,
													export: openExportDialog,
												}}
											/>
										</ViewportOverlay>
									</Viewport>
									{/* Sibling of the toolbar/viewport (like ShortcutHelpModal) so the
									    backdrop covers the whole canvas including the toolbar */}
									{isExportDialogOpen && (
										<ExportDialog
											defaultMargin={EXPORT_FIT_PADDING}
											onClose={closeExportDialog}
											onSubmit={handleExportSubmit}
										/>
									)}
								</CanvasRoot>
							</CanvasViewportRefContext>
						</TextRegionRegistryContext>
					</ObjectComponentRegistryContext>
				</CanvasRegistriesContext>
			</CanvasMessagesContext>
		</CanvasThemeContext>
	);
};
export const Canvas = memo(CanvasComponent);
