import {
	memo,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";

import { CanvasProviders } from "./CanvasProviders";
import {
	CanvasRoot,
	Container,
	ScrollSyncedOverlay,
	Viewport,
	ViewportOverlay,
	ZoomScaledOverlay,
} from "./CanvasStyled";
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
import { useViewportCulling } from "./hooks/useViewportCulling";
import type { CanvasViewportHandle } from "./hooks/useViewportHandle";
import { useViewportHandle } from "./hooks/useViewportHandle";
import { resolveCanvasMessages } from "./messages/CanvasMessages";
import type { CanvasMessages } from "./messages/CanvasMessagesTypes";
import { createCanvasRegistries, defaultCanvasRegistries } from "./registries";
import type { CanvasConfig } from "./registries";
import { graftTextEditDraft } from "./utils/graftTextEditDraft";
import { CanvasView } from "../presentations/CanvasView";
import type { CanvasTheme } from "../theme/CanvasTheme";
import { buildThemeCssVars } from "../theme/themeCssVars";
import { darkCanvasTheme } from "../theme/themePresets";
import { ConnectionAnchorsLayer } from "./ui/controls/ConnectionAnchorsLayer";
import { ConnectorControlsLayer } from "./ui/controls/ConnectorControlsLayer";
import { SelectionControlsLayer } from "./ui/controls/SelectionControlsLayer";
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
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { Camera } from "../states/canvas/Viewport";

type CanvasProps = {
	// ── Model & persistence (the core contract) ──
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
	doc: CanvasDoc;
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

	// ── Host notifications (read-out only) ──
	/**
	 * Callback invoked when the selection changes, receiving the new set of
	 * selected IDs (empty when nothing is selected). Shapes and the connector
	 * are mutually exclusive and reported together as one ordered list. Use this
	 * to drive host UI outside the canvas (e.g. an external property panel).
	 */
	onSelectionChange?: (selectedIds: string[]) => void;
	/**
	 * Invoked when the camera (pan/zoom) changes — on internal gestures and on
	 * `ref.current.viewport.setViewport` (not on container resize). Read-only: use
	 * it to persist or mirror the view. Do **not** feed it back into
	 * `initialConfig.viewport` (mount-only) or drive the view from it — the canvas
	 * owns the live camera; a mirror-back would fight continuous gestures. Push
	 * programmatic changes via `ref.current.viewport` instead.
	 */
	onViewportChange?: (viewport: Camera) => void;

	// ── Appearance & localization (live) ──
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
	 * Active locale (default `"en"`). Selects the canvas's built-in dictionary
	 * (en / ja) and is exposed to plugins via `useCanvasLocale`. Resolution is
	 * exact → language subtag (`"ja-JP"` → `"ja"`) → `"en"`.
	 */
	locale?: string;
	/**
	 * Partial overrides applied on top of the locale-resolved dictionary
	 * (tooltips, menus, toasts). Use this to tweak individual strings; use
	 * `locale` to pick the language.
	 */
	messages?: Partial<CanvasMessages>;

	// ── Host-integration escape hatches ──
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
	 * When provided, the export dialog delivers the exported image here instead
	 * of triggering a browser download. Use this when the host owns file saving
	 * (e.g. the VSCode extension writing into the workspace).
	 */
	onExportImage?: (payload: CanvasExportImagePayload) => void;

	// ── Toolbar (host UI slots) ──
	/**
	 * Host-provided toolbar customization: UI slots at the edges (`leading` /
	 * `trailing`) and an override of the shape-tool arrangement (`layout`). Grouped
	 * for cohesion; since the JSX slots already break `<Canvas>`'s memo, a host
	 * rendering this inline can `useMemo` the object to avoid extra re-renders.
	 */
	toolbar?: {
		/**
		 * Host UI inserted at the left edge of the toolbar (e.g. save/open buttons).
		 * Rendered inside a `data-gesture="none"` container, so plain `onClick` works.
		 */
		leading?: React.ReactNode;
		/**
		 * Host UI inserted at the right edge of the toolbar (e.g. a settings button).
		 * Rendered inside a `data-gesture="none"` container, so plain `onClick` works.
		 */
		trailing?: React.ReactNode;
		/**
		 * Overrides the top-level arrangement of the shape tools: an ordered mix of
		 * pinned preset buttons and category flyouts (see {@link ToolbarEntry}). Omit
		 * for the default layout (basic primitives + sticky pinned, general /
		 * annotation as flyouts).
		 */
		layout?: ToolbarEntry[];
	};

	// ── Focus behavior ──
	/**
	 * Focus the canvas on mount so keyboard shortcuts work immediately (default
	 * true). Shortcuts are scoped to the focused canvas; set false when embedding
	 * multiple canvases (or when the host manages focus) so mounting does not
	 * steal focus. Top-level (not in `initialConfig`) to match the React-idiomatic
	 * `autoFocus` spelling.
	 */
	autoFocus?: boolean;

	// ── Mount-time setup (read once; remount with a new key to change) ──
	/**
	 * Per-canvas configuration read **once at mount** ({@link CanvasConfig}): the
	 * capability set (available object types, commands, plugins) plus the initial
	 * view (`viewport`). Restricts what this canvas can create/handle (plugin-style
	 * extensibility and feature-gating), independently of any other `<Canvas>` on
	 * the page. Omit for the full default set.
	 *
	 * **Caller responsibility**: when `objectTypes` is restricted, only pass docs
	 * whose object types remain enabled — otherwise state construction throws
	 * "Mapper not found" (docs/01-design-philosophy.md principle 4).
	 *
	 * Later changes are ignored (the configuration is part of a canvas's identity).
	 * To reconfigure, remount with a new React `key`
	 * (`<Canvas key={configId} initialConfig={...} />`).
	 */
	initialConfig?: CanvasConfig;

	// ── Imperative handle ──
	/**
	 * Receives the imperative Canvas handle ({@link CanvasHandle}), grouping every
	 * imperative API by subsystem: `ref.current.viewport.setViewport(camera)` to
	 * move pan/zoom (fit-to-content, jump-to-node, a scripted intro), and
	 * `ref.current.export.toSvgString()` / `toPngBlob()` to get the exported image
	 * programmatically. Imperative by design so the view cannot feed back into a
	 * render loop the way a controlled value prop would.
	 */
	ref?: React.Ref<CanvasHandle>;
};

/**
 * Imperative Canvas API delivered through the component `ref`. Each subsystem
 * owns a namespace; new imperative capabilities are added as new namespaces
 * rather than new props.
 */
export type CanvasHandle = {
	/** Pan/zoom control (see {@link CanvasViewportHandle}). */
	viewport: CanvasViewportHandle;
	/** Image export (see {@link CanvasExportHandle}). */
	export: CanvasExportHandle;
};

const CanvasComponent = ({
	doc,
	syncNonce,
	onCommit,
	onSelectionChange,
	onViewportChange,
	theme = darkCanvasTheme,
	locale = "en",
	messages,
	onUndo,
	onRedo,
	onExportImage,
	toolbar,
	autoFocus = true,
	initialConfig,
	ref,
}: CanvasProps) => {
	// UI strings resolved from locale, then host overrides applied. Distributed
	// via context along with the raw locale (plugins resolve their own strings).
	const mergedMessages = useMemo(
		() => resolveCanvasMessages(locale, messages),
		[locale, messages],
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
	// provided via context (React tree), so the two can never desync. Canvas is the
	// provider, so its own hooks cannot read the bundle back from context (they would
	// get the default, missing any plugin types); they receive it as an explicit
	// `registries` argument instead.
	const [registries] = useState(() =>
		initialConfig
			? createCanvasRegistries(initialConfig)
			: defaultCanvasRegistries,
	);

	// Reducer for canvas state management with history. initialConfig.viewport
	// (if any) seeds the initial viewport so the first paint is already at the
	// host's pan/zoom — see useCanvasReducer for the mount handoff.
	const [state, dispatch] = useCanvasReducer(
		doc,
		registries,
		docDefaults,
		initialConfig?.viewport,
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
	// (ref.current.viewport) and notify the host of camera changes
	// (onViewportChange). The canvas stays authoritative for the live camera — the
	// host reads it out and pushes changes in imperatively, with no controlled
	// value prop that could feed back and fight continuous gestures.
	const viewportHandle = useViewportHandle(dispatch);
	useNotifyViewportChange(state.viewport, onViewportChange);

	// Notify parent component when a save is required (after commit or undo/redo)
	useNotifySaveRequest(state, onCommit, selfSaveNonceTracker, registries);

	// Sync external doc changes
	useSyncExternalDoc({
		canvasDoc: doc,
		syncNonce,
		canvasState: state,
		dispatch,
		resetGestureState,
		selfSaveNonceTracker,
		registries,
	});

	// Use wheel handler from GestureRecognizer.
	// Scoped to canvasRef (the container element) so wheel events outside the canvas are not captured.
	useCanvasWheel(canvasRef, wheelHandler);

	// Container resize handling
	useContainerResize(canvasRef, dispatch);

	// Paste handling (keyboard shortcut + context menu)
	const handlePaste = useClipboardPaste(
		state.internalClipboard,
		dispatch,
		registries,
	);

	// Keyboard shortcuts handling — scoped to the focusable canvas root (rootRef),
	// so with multiple Canvases on a page only the focused one handles shortcuts.
	useKeyboardShortcuts({
		containerRef: rootRef,
		canvasState: state,
		dispatch,
		callbacks: { undo: onUndo, redo: onRedo, paste: handlePaste },
		registries,
	});

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

	// Objects as the view should show them *right now*: the slot being edited
	// carries the uncommitted editor text, so geometry derived from it (the
	// record's title band) follows every keystroke instead of jumping on commit.
	// Rendering and editor placement only — the committed state.objects stays the
	// input of hit testing, snapping and bboxes.
	const draftObjects = useMemo(
		() => graftTextEditDraft(state.objects, state.textEditState),
		[state.objects, state.textEditState],
	);

	// Viewport culling (issue #212): only objects intersecting the visible
	// world rect are rendered. Export clones the live SVG DOM, so it suspends
	// culling for the duration of the snapshot via withCullingSuspended.
	const { visibleObjectIds, withCullingSuspended } = useViewportCulling(
		state.objects,
		state.rootIds,
		state.viewport,
		state.textEditState?.objectId ?? null,
	);

	// Image export: the imperative export handle and the export dialog
	const {
		exportHandle,
		isExportDialogOpen,
		openExportDialog,
		closeExportDialog,
		handleExportSubmit,
	} = useCanvasExport({
		svgRef,
		canvasState: state,
		registries,
		onExportImage,
		dispatch,
		notifyError,
		withCullingSuspended,
	});

	// Single imperative Canvas handle: assemble the subsystem sub-handles into one
	// namespaced object so the whole imperative surface is delivered through `ref`.
	useImperativeHandle(
		ref,
		() => ({ viewport: viewportHandle, export: exportHandle }),
		[viewportHandle, exportHandle],
	);

	const { minX, minY, zoom } = state.viewport;

	// Zoom button enabled/disabled state is delegated to the command's canExecute (single source of truth).
	// Canvas provides the registries context, so it cannot read it back via a hook
	// and uses the pure resolver against its directly-held bundle instead.
	const canZoomIn =
		resolveCommandState(state, registries, "zoomIn")?.enabled ?? false;
	const canZoomOut =
		resolveCommandState(state, registries, "zoomOut")?.enabled ?? false;

	return (
		<CanvasProviders
			theme={theme}
			locale={locale}
			messages={mergedMessages}
			registries={registries}
			viewportElementRef={canvasRef}
		>
			<CanvasRoot
				ref={rootRef}
				tabIndex={0}
				style={themeCssVars}
				onContextMenu={handleContextMenu}
				{...pointerHandlers}
			>
				<Toolbar
					activePresetId={state.shapeDrawing?.preset.id ?? null}
					openCategoryId={state.stencilLibraryOpenCategory}
					zoom={state.viewport.zoom}
					canZoomIn={canZoomIn}
					canZoomOut={canZoomOut}
					layout={toolbar?.layout}
					leading={toolbar?.leading}
					trailing={toolbar?.trailing}
				/>
				<Viewport
					data-id="canvas"
					data-kind="canvas"
					ref={canvasRef}
					cursor={state.shapeDrawing ? "crosshair" : undefined}
				>
					<Container>
						<CanvasView
							objects={draftObjects}
							rootIds={state.rootIds}
							viewport={state.viewport}
							svgRef={svgRef}
							textEditObjectId={state.textEditState?.objectId ?? null}
							textEditSlotId={
								state.textEditState?.kind === "shape"
									? state.textEditState.slotId
									: null
							}
							isDrawMode={!!state.shapeDrawing}
							visibleObjectIds={visibleObjectIds}
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
							<SelectionControlsLayer
								selectedIds={state.selectedIds}
								objects={state.objects}
								zoom={state.viewport.zoom}
								isTextEditing={!!state.textEditState}
							/>
							<DragGhost
								stencilLibraryDrag={state.stencilLibraryDrag}
								docDefaults={state.docDefaults}
							/>
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
						<ZoomScaledOverlay
							style={{
								left: -minX * zoom,
								top: -minY * zoom,
								transform: `scale(${zoom})`,
							}}
						>
							<TextEditorLayer
								textEditState={state.textEditState}
								objects={draftObjects}
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
		</CanvasProviders>
	);
};
export const Canvas = memo(CanvasComponent);
