import {
	memo,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";

import type { CanvasGestureHandling } from "./CanvasGestureHandling";
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
import type { CanvasHandle } from "./handles/CanvasHandle";
import { useCanvasHandle } from "./handles/useCanvasHandle";
import { useCanvasFocusScope } from "./hooks/useCanvasFocusScope";
import { useCanvasReducer } from "./hooks/useCanvasReducer";
import { useCanvasWheel } from "./hooks/useCanvasWheel";
import { useClipboardPaste } from "./hooks/useClipboardPaste";
import { useClipboardWrite } from "./hooks/useClipboardWrite";
import { resolveCommandState } from "./hooks/useCommandState";
import { useContainerResize } from "./hooks/useContainerResize";
import { useCooperativeTouchClaim } from "./hooks/useCooperativeTouchClaim";
import { useDevicePixelRatio } from "./hooks/useDevicePixelRatio";
import { useErrorNotification } from "./hooks/useErrorNotification";
import type { CanvasExportImagePayload } from "./hooks/useExportDialog";
import { useExportDialog } from "./hooks/useExportDialog";
import { useFontsLoadedNonce } from "./hooks/useFontsLoadedNonce";
import { useGestureRecognizer } from "./hooks/useGestureRecognizer";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useNotifySaveRequest } from "./hooks/useNotifySaveRequest";
import { useNotifySelectionChange } from "./hooks/useNotifySelectionChange";
import { useNotifyViewportChange } from "./hooks/useNotifyViewportChange";
import { useRevealTextEditCaret } from "./hooks/useRevealTextEditCaret";
import { useSelfSaveNonceTracker } from "./hooks/useSelfSaveNonceTracker";
import { useSyncExternalDoc } from "./hooks/useSyncExternalDoc";
import { useViewportCulling } from "./hooks/useViewportCulling";
import { resolveCanvasMessages } from "./messages/CanvasMessages";
import type { CanvasMessages } from "./messages/CanvasMessagesTypes";
import { createCanvasRegistries, defaultCanvasRegistries } from "./registries";
import type { CanvasConfig } from "./registries";
import { CanvasView } from "../rendering/CanvasView";
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
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { Camera } from "../states/canvas/Viewport";
import type {
	ObjectMenuPropertyUpdater,
	OpenReferenceHandler,
	OpenReferencePayload,
} from "./ui/menu/ObjectMenu/ObjectMenuTypes";
import { Toolbar, type ToolbarEntry } from "./ui/menu/Toolbar";
import { ExportDialog } from "./ui/modal/ExportDialog";
import { ShortcutHelpModal } from "./ui/modal/ShortcutHelp/ShortcutHelpModal";
import { graftTextEditDraft } from "./utils/graftTextEditDraft";
import { EXPORT_FIT_PADDING } from "./utils/resolveExportOptions";
import { resolveSelectedTextSlot } from "./utils/resolveSelectedTextSlot";
import { snapViewportToDevicePixels } from "./utils/snapViewportToDevicePixels";

type CanvasProps = {
	// ── Model & persistence (the core contract) ──
	/**
	 * The CanvasDoc to display.
	 *
	 * **Caller responsibility**: always pass a valid doc that has gone through
	 * `createCanvasParser` (two-stage validation). Canvas does not re-validate
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
	 * Background grid settings. Omit for the default grid (shown, 25 world units);
	 * each field is optional, so `{ show: false }` alone is valid. Live: can be
	 * changed at runtime. Since an object literal breaks `<Canvas>`'s memo, a host
	 * rendering this inline can `useMemo` it to avoid extra re-renders.
	 *
	 * The grid line color is not a setting here — it is derived from the effective
	 * canvas surface (theme background, or the doc's `background`) so it stays
	 * readable on any color.
	 */
	grid?: {
		/**
		 * Whether to render the grid (default `true`). The grid is a viewing aid
		 * only — it is already excluded from image export — so this toggles the
		 * on-screen display without changing exported images.
		 */
		show?: boolean;
		/**
		 * Base grid spacing in world units (default `25`). Sets the medium grid
		 * interval; bold lines fall every 4× this value and the multi-level grid
		 * adapts to zoom (see the canvas's grid layer). Ignored when `show` is
		 * `false`.
		 */
		size?: number;
	};
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
	/**
	 * Called when "open reference" is pressed for an object carrying
	 * `meta.reference`. Omit it and the menu item is never offered — opening a
	 * file is the host's business. The canvas passes the reference through
	 * untouched: it neither resolves nor validates the path.
	 */
	onOpenReference?: (payload: OpenReferencePayload) => void;

	// ── Toolbar (visibility & host UI slots) ──
	/**
	 * Host-provided toolbar customization: visibility (`show`), UI slots at the
	 * edges (`leading` / `trailing`) and an override of the shape-tool arrangement
	 * (`layout`). Grouped for cohesion; since the JSX slots already break
	 * `<Canvas>`'s memo, a host rendering this inline can `useMemo` the object to
	 * avoid extra re-renders.
	 */
	toolbar?: {
		/**
		 * Whether to render the toolbar (default `true`). `false` removes the whole
		 * bar — shape tools, zoom controls, the help button and the `leading` /
		 * `trailing` slots — and the canvas area takes the full height. Keyboard
		 * shortcuts still work (`?` opens the shortcut help, rendered outside the
		 * bar), but the default UI is left with no entry point for drawing new
		 * shapes, so this suits read-mostly hosts (previews, embedded viewers).
		 */
		show?: boolean;
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
		 * for the default layout, which pins every core preset directly and opens no
		 * flyout — anything a plugin supplies must be added here by the host.
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

	// ── Host page coexistence ──
	/**
	 * How the canvas shares gestures with the page embedding it
	 * ({@link CanvasGestureHandling}), default `"greedy"`. Set `"cooperative"` when
	 * embedding the canvas in a document that scrolls: the wheel and a one-finger
	 * background drag move the page past it, a one-finger drag on a shape still
	 * drags the shape, and the view itself pans with two fingers. Zooming is
	 * untouched: Ctrl+wheel, pinch and the toolbar's zoom controls keep working
	 * under either value. Reactive, so a host can hand the canvas the gestures on
	 * an explicit opt-in (a click, an "interact" button).
	 */
	gestureHandling?: CanvasGestureHandling;

	// ── Mount-time setup (read once; remount with a new key to change) ──
	/**
	 * Per-canvas configuration read **once at mount** ({@link CanvasConfig}): the
	 * capability set (available object types, commands, plugins) plus the view
	 * setup — the initial camera (`viewport`) and how far it may be scrolled
	 * (`scrollBounds`, infinite unless set). Restricts what this canvas can
	 * create/handle (plugin-style extensibility and feature-gating), independently
	 * of any other `<Canvas>` on the page. Omit for the full default set.
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
	 * imperative API by subsystem: `ref.current.viewport` to move pan/zoom
	 * (fit-to-content, jump-to-node, a scripted intro), `ref.current.selection` to
	 * select objects programmatically, `ref.current.export` to get the exported
	 * image, and `ref.current.measure` / `history` / `interaction` to read back how
	 * the canvas drew what it was given. Imperative by design so the view cannot
	 * feed back into a render loop the way a controlled value prop would.
	 */
	ref?: React.Ref<CanvasHandle>;
};

const CanvasComponent = ({
	doc,
	syncNonce,
	onCommit,
	onSelectionChange,
	onViewportChange,
	theme = darkCanvasTheme,
	grid,
	locale = "en",
	messages,
	onUndo,
	onRedo,
	onExportImage,
	onOpenReference,
	toolbar,
	autoFocus = true,
	gestureHandling = "greedy",
	initialConfig,
	ref,
}: CanvasProps) => {
	const mergedMessages = useMemo(
		() => resolveCanvasMessages(locale, messages),
		[locale, messages],
	);

	const themeCssVars = useMemo(() => buildThemeCssVars(theme.tokens), [theme]);

	const docDefaults = useMemo(
		() => ({ fontFamily: theme.fontFamily }),
		[theme.fontFamily],
	);

	// rootRef spans toolbar + canvas area and carries pointer capture; canvasRef is the
	// canvas area alone, which keeps edge scrolling aligned to the region below the toolbar.
	const rootRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);

	// The stable instance is both closed over by the reducer and provided via context, so
	// the two can never desync. Canvas is the provider, so its own hooks must take
	// `registries` as an explicit argument — reading context here yields the default,
	// missing any plugin types.
	const [registries] = useState(() =>
		initialConfig
			? createCanvasRegistries(initialConfig)
			: defaultCanvasRegistries,
	);

	// initialConfig.viewport seeds the initial viewport so the first paint is already at
	// the host's pan/zoom (see useCanvasReducer for the mount handoff).
	const [state, dispatch] = useCanvasReducer(
		doc,
		registries,
		docDefaults,
		initialConfig?.viewport,
		initialConfig?.scrollBounds,
	);

	// Keeps docDefaults current when the host swaps themes at runtime; the reducer no-ops
	// when the values are unchanged.
	useEffect(() => {
		dispatch({ type: "SET_DOC_DEFAULTS", docDefaults });
	}, [docDefaults, dispatch]);

	// Web fonts land after the first paint, so every content-derived box mapped
	// before then was measured against a fallback face. Nothing in the doc or the
	// theme moves when the real one arrives, which is why this needs a signal of
	// its own; a pass that moves no box returns the same state, so the nonce
	// firing more than once costs nothing.
	const fontsLoadedNonce = useFontsLoadedNonce();
	useEffect(() => {
		if (fontsLoadedNonce > 0) {
			dispatch({ type: "REMEASURE_TEXT" });
		}
	}, [fontsLoadedNonce, dispatch]);

	// Single toast slot shared by every error source (clipboard, export).
	const { errorNotification, notifyError } = useErrorNotification();

	useClipboardWrite(state.internalClipboard, notifyError);

	// Declared before useSyncExternalDoc so resetGestureState is available to it.
	const { pointerHandlers, wheelHandler, resetGestureState } =
		useGestureRecognizer({
			dispatch,
			containerRef: rootRef,
			svgRef,
			canvasState: state,
			gestureHandling,
		});

	// Shared between the save-delivery and external-sync hooks so overlapping saves that
	// fold back out of order are still recognized as self-saves (#29).
	const selfSaveNonceTracker = useSelfSaveNonceTracker();

	useNotifySelectionChange(
		state.selectedIds,
		state.selectedConnectorId,
		onSelectionChange,
	);

	useNotifyViewportChange(state.viewport, onViewportChange);

	useNotifySaveRequest(state, onCommit, selfSaveNonceTracker, registries);

	useSyncExternalDoc({
		canvasDoc: doc,
		syncNonce,
		canvasState: state,
		dispatch,
		resetGestureState,
		selfSaveNonceTracker,
		registries,
	});

	// Scoped to canvasRef so wheel events outside the canvas are not captured.
	useCanvasWheel(canvasRef, wheelHandler, gestureHandling);

	// Cooperative: a touch starting on a shape stays a shape drag instead of
	// becoming a page scroll (browsers ignore touch-action on inner SVG elements).
	useCooperativeTouchClaim(rootRef, gestureHandling);

	useContainerResize(canvasRef, dispatch);

	const handlePaste = useClipboardPaste(
		state.internalClipboard,
		dispatch,
		registries,
	);

	// Scoped to the focusable canvas root, so with several Canvases on a page only the
	// focused one handles shortcuts.
	useKeyboardShortcuts({
		containerRef: rootRef,
		canvasState: state,
		dispatch,
		callbacks: { undo: onUndo, redo: onRedo, paste: handlePaste },
		registries,
	});

	// Initial focus plus reclaiming it when it silently falls to body because the focused
	// element unmounted.
	useCanvasFocusScope(rootRef, autoFocus);

	const handleMenuPropertyUpdate = useCallback<ObjectMenuPropertyUpdater>(
		(property, value, commit, coalesceHistory = false) => {
			dispatch({
				type: "MENU_PROPERTY_UPDATE",
				property,
				value,
				commit,
				coalesceHistory,
			});
		},
		[dispatch],
	);

	// The host callback is read through a ref, so passing a new function each
	// render does not defeat ObjectMenu's memo. Only adding or removing the prop
	// changes the identity, which is also what decides whether the item shows.
	const onOpenReferenceRef = useRef(onOpenReference);
	useEffect(() => {
		onOpenReferenceRef.current = onOpenReference;
	});
	const hasOpenReferenceHandler = onOpenReference !== undefined;
	const handleOpenReference = useMemo<OpenReferenceHandler | undefined>(
		() =>
			hasOpenReferenceHandler
				? (payload) => onOpenReferenceRef.current?.(payload)
				: undefined,
		[hasOpenReferenceHandler],
	);

	// Shared by every modal: only one can be open, so closing needs no kind.
	const closeModal = useCallback(() => {
		dispatch({ type: "CLOSE_MODAL" });
	}, [dispatch]);

	const handleContextMenu = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			// data-gesture="none" elements (e.g. the text-editing surface) keep the
			// browser's native context menu.
			if (isGestureOptedOut(e.target)) {
				return;
			}
			e.preventDefault();
		},
		[],
	);

	// The slot being edited carries the uncommitted editor text, so geometry derived from
	// it follows every keystroke instead of jumping on commit. Rendering, selection
	// feedback, editor placement and the menu anchor only — hit testing and snapping
	// still read committed state.objects.
	const draftObjects = useMemo(
		() =>
			graftTextEditDraft(
				state.objects,
				state.textEditState,
				state.docDefaults.fontFamily,
				registries.objectContentResizer,
			),
		[
			state.objects,
			state.textEditState,
			state.docDefaults.fontFamily,
			registries,
		],
	);

	// The menu is anchored below the drawn extent, which during a text edit is the
	// draft-grafted box (a keystroke regrows an auto-sized text before commit), so
	// the menu reads the same objects the rendering layers draw.
	const menuCanvasState = useMemo(
		() =>
			draftObjects === state.objects
				? state
				: { ...state, objects: draftObjects },
		[state, draftObjects],
	);

	const revealCaret = useRevealTextEditCaret({
		viewport: state.viewport,
		dispatch,
	});

	// Only objects intersecting the visible world rect are rendered (#212). Export clones
	// the live SVG DOM, so it suspends culling for the snapshot via withCullingSuspended.
	const { visibleObjectIds, withCullingSuspended } = useViewportCulling(
		state.objects,
		state.rootIds,
		state.viewport,
		state.textEditState?.objectId ?? null,
		registries.objectVisualBounds,
	);

	// Built here rather than beside the other state-derived hooks because the
	// export namespace needs the culling suspension declared just above.
	const canvasHandle = useCanvasHandle({
		dispatch,
		canvasState: state,
		registries,
		svgRef,
		withCullingSuspended,
	});
	const handleExportSubmit = useExportDialog({
		svgRef,
		canvasState: state,
		registries,
		onExportImage,
		dispatch,
		notifyError,
		withCullingSuspended,
	});

	useImperativeHandle(ref, () => canvasHandle, [canvasHandle]);

	// The camera the scene is drawn with. It is the committed one moved onto the
	// device pixel grid, so text stops creeping inside its shape as the viewport
	// pans (see snapViewportToDevicePixels). Every layer that positions itself
	// from the camera has to take this one, or the SVG and the HTML overlays
	// above it would sit a fraction of a pixel apart.
	const devicePixelRatio = useDevicePixelRatio();
	const drawnViewport = useMemo(
		() => snapViewportToDevicePixels(state.viewport, devicePixelRatio),
		[state.viewport, devicePixelRatio],
	);
	const { minX, minY, zoom } = drawnViewport;

	const selectedTextSlot = resolveSelectedTextSlot(state);

	// Delegated to the command's canExecute as the single source of truth. Canvas provides
	// the registries context, so it resolves against its directly-held bundle, not a hook.
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
				gestureHandling={gestureHandling}
				tabIndex={0}
				style={themeCssVars}
				onContextMenu={handleContextMenu}
				{...pointerHandlers}
			>
				{toolbar?.show !== false && (
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
				)}
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
							viewport={drawnViewport}
							svgRef={svgRef}
							textEditObjectId={state.textEditState?.objectId ?? null}
							textEditSlotId={
								state.textEditState?.kind === "shape"
									? state.textEditState.slotId
									: null
							}
							isDrawMode={!!state.shapeDrawing}
							visibleObjectIds={visibleObjectIds}
							showGrid={grid?.show}
							gridSize={grid?.size}
							background={state.background}
							surfaceColor={theme.tokens.canvasBg}
						>
							<PendingConnectorOverlay
								pendingConnector={state.pendingConnector}
								objects={state.objects}
							/>
							<SelectionOverlay
								selectedIds={state.selectedIds}
								objects={draftObjects}
								multiSelectGroup={state.multiSelectGroup}
								selectedTextSlot={selectedTextSlot}
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
								isTextSlotSelected={selectedTextSlot !== null}
								activeDragKind={state.activeDragKind}
							/>
							<ConnectionAnchorsLayer
								selectedIds={state.selectedIds}
								objects={state.objects}
								zoom={state.viewport.zoom}
								pendingConnector={state.pendingConnector}
								editingConnectorId={state.editingConnectorId}
								editingEndpoint={state.editingEndpoint}
								isTextEditing={!!state.textEditState}
								activeDragKind={state.activeDragKind}
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
						{/* HTML that follows scroll and scales with zoom */}
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
								onCaretMove={revealCaret}
								onSelectionChange={(selection) =>
									dispatch({ type: "UPDATE_TEXT_EDIT_SELECTION", selection })
								}
								onToggleFormat={(format) =>
									dispatch({ type: "TOGGLE_TEXT_FORMAT", format })
								}
							/>
						</ZoomScaledOverlay>
						{/* HTML whose position follows zoom but whose size does not */}
						<ScrollSyncedOverlay
							style={{ left: -minX * zoom, top: -minY * zoom }}
						>
							<ObjectMenu
								canvasState={menuCanvasState}
								onPropertyUpdate={handleMenuPropertyUpdate}
								onOpenReference={handleOpenReference}
							/>
						</ScrollSyncedOverlay>
					</Container>
					<ViewportOverlay>
						<ErrorToast notification={errorNotification} />
						<ContextMenu
							position={state.contextMenuPosition}
							canvasState={state}
							callbacks={{ paste: handlePaste }}
						/>
					</ViewportOverlay>
				</Viewport>
				{/* Every modal is rendered here, as a sibling of the toolbar/viewport, so
				    its backdrop covers the whole canvas including the toolbar */}
				{state.activeModal === "export" && (
					<ExportDialog
						defaultMargin={EXPORT_FIT_PADDING}
						onClose={closeModal}
						onSubmit={handleExportSubmit}
					/>
				)}
				{state.activeModal === "shortcutHelp" && (
					<ShortcutHelpModal onClose={closeModal} />
				)}
			</CanvasRoot>
		</CanvasProviders>
	);
};
export const Canvas = memo(CanvasComponent);
