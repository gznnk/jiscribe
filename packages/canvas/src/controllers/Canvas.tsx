import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { advanceTextMeasurementGeneration } from "@jiscribe/doc/text/measure/textMeasurementSlot";
import {
	memo,
	useCallback,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";

import type { CanvasGestureHandling } from "./CanvasGestureHandling";
import { CanvasProviders } from "./CanvasProviders";
import {
	CanvasBody,
	CanvasRoot,
	Container,
	ScrollSyncedOverlay,
	Viewport,
	ViewportOverlay,
	ZoomScaledOverlay,
} from "./CanvasStyled";
import type { Camera, CanvasSidebarsState } from "./CanvasTypes";
import { isGestureOptedOut } from "./gestures/recognizer/targeting/isGestureOptedOut";
import type { CanvasHandle } from "./handles/CanvasHandle";
import { useCanvasHandle } from "./handles/useCanvasHandle";
import { useBlockBrowserZoom } from "./hooks/useBlockBrowserZoom";
import { useCanvasFocusScope } from "./hooks/useCanvasFocusScope";
import { useCanvasReducer } from "./hooks/useCanvasReducer";
import { useCanvasWheel } from "./hooks/useCanvasWheel";
import { useCanvasZoomStore } from "./hooks/useCanvasZoomStore";
import { useClipboardPaste } from "./hooks/useClipboardPaste";
import { useClipboardWrite } from "./hooks/useClipboardWrite";
import { resolveCommandState } from "./hooks/useCommandState";
import { useContainerResize } from "./hooks/useContainerResize";
import { useCooperativeTouchClaim } from "./hooks/useCooperativeTouchClaim";
import { useDevicePixelSnappedViewport } from "./hooks/useDevicePixelSnappedViewport";
import { useDocFonts } from "./hooks/useDocFonts";
import type { ResolveImage } from "./hooks/useDocImages";
import { useDocImages } from "./hooks/useDocImages";
import { useErrorNotification } from "./hooks/useErrorNotification";
import type { CanvasExportImagePayload } from "./hooks/useExportDialog";
import { useExportDialog } from "./hooks/useExportDialog";
import { useGestureRecognizer } from "./hooks/useGestureRecognizer";
import { useInitialViewOpen } from "./hooks/useInitialViewOpen";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useNotifySaveRequest } from "./hooks/useNotifySaveRequest";
import { useNotifySelectionChange } from "./hooks/useNotifySelectionChange";
import { useNotifySidebarsChange } from "./hooks/useNotifySidebarsChange";
import { useNotifyViewportChange } from "./hooks/useNotifyViewportChange";
import { usePropertyPanelState } from "./hooks/usePropertyPanelState";
import { usePropertyUpdaters } from "./hooks/usePropertyUpdaters";
import { useSelfSaveNonceTracker } from "./hooks/useSelfSaveNonceTracker";
import { useSnapshotRenderScope } from "./hooks/useSnapshotRenderScope";
import { useSyncExternalDoc } from "./hooks/useSyncExternalDoc";
import { useSyncStencilLibraryAvailability } from "./hooks/useSyncStencilLibraryAvailability";
import { useTextEditSession } from "./hooks/useTextEditSession";
import { useVisibleObjectIds } from "./hooks/useVisibleObjectIds";
import { createCanvasRegistries, defaultCanvasRegistries } from "./registries";
import type { CanvasConfig } from "./registries";
import { useLatestRef } from "../foundation/hooks/useLatestRef";
import { resolveCanvasMessages } from "../foundation/i18n/CanvasMessages";
import type { CanvasMessages } from "../foundation/i18n/CanvasMessagesTypes";
import type { CanvasTheme } from "../foundation/theme/CanvasTheme";
import { buildThemeCssVars } from "../foundation/theme/themeCssVars";
import { darkCanvasTheme } from "../foundation/theme/themePresets";
import { CanvasView } from "../rendering/CanvasView";
import { CanvasControlLayers } from "./ui/controls/CanvasControlLayers";
import { TextEditorLayer } from "./ui/editors/TextEditorLayer";
import { ErrorToast } from "./ui/feedback/ErrorToast";
import {
	BottomToolbar,
	resolveBottomToolbarPresets,
	type BottomToolbarOptions,
} from "./ui/menu/BottomToolbar";
import { ContextMenu } from "./ui/menu/ContextMenu";
import { ObjectMenu } from "./ui/menu/ObjectMenu";
import type {
	OpenReferenceHandler,
	OpenReferencePayload,
} from "./ui/menu/ObjectMenu/ObjectMenuTypes";
import { PropertyPanel } from "./ui/menu/PropertyPanel/PropertyPanel";
import { useResolvedStencilLibrary } from "./ui/menu/StencilLibrary/hooks/useResolvedStencilLibrary";
import { StencilLibraryPanel } from "./ui/menu/StencilLibrary/StencilLibraryPanel";
import {
	DEFAULT_TOOLBAR_SECTIONS,
	Toolbar,
	ToolbarCommandStateContext,
	type ToolbarSection,
} from "./ui/menu/Toolbar";
import { ExportDialog } from "./ui/modal/ExportDialog";
import { ShortcutHelpModal } from "./ui/modal/ShortcutHelp/ShortcutHelpModal";
import type { StencilCategory } from "./ui/objects/StencilCategory";
import { collectDocFontRequests } from "./utils/collectDocFontRequests";
import { EXPORT_FIT_PADDING } from "./utils/resolveExportOptions";
import { resolveRenderedObjectIds } from "./utils/resolveRenderedObjectIds";
import { isAnySidebarOpen } from "./utils/sidebarsState";

type CanvasProps = {
	// ── Document ──
	/**
	 * The document to display. Must already have passed `createCanvasParser`:
	 * the canvas does not re-validate and assumes unique ids, referential
	 * integrity and acyclicity, so a broken doc can hang its traversals
	 * (docs/01-design-philosophy.md, principle 4).
	 */
	doc: CanvasDoc;
	/**
	 * Identifies the load `doc` came from — a file path, a counter bumped on every
	 * read — as long as two documents never share one. Change it when a different
	 * document goes onto a mounted canvas: the undo history is dropped, so Ctrl+Z
	 * cannot bring the previous document back under the new name. Keep it for
	 * changes to the same document (an external rewrite, the host re-sending after
	 * its own undo/redo), which stay undoable. Omitted, every incoming doc is an
	 * external edit and the history is kept.
	 */
	docLoadId?: string;
	/**
	 * Nonce of the most recent incoming sync message. When it matches a nonce
	 * handed out by `onCommit`, the doc is our own save folding back and is
	 * dropped instead of applied as an external change (see useSyncExternalDoc).
	 */
	syncNonce?: string;
	/**
	 * Called on every committable action (drag end, click, …) with the doc to
	 * persist and a save nonce the host echoes back through `syncNonce`.
	 */
	onCommit?: (doc: CanvasDoc, saveNonce: string) => void;

	// ── Read-outs ──
	/**
	 * Called when the selection changes with the selected ids in order (empty
	 * when nothing is selected). Shapes and the connector are mutually exclusive
	 * and reported through the same list.
	 */
	onSelectionChange?: (selectedIds: string[]) => void;
	/**
	 * Called when the camera changes — on gestures and on
	 * `ref.current.viewport.setViewport`, not on container resize. Read-only:
	 * persist or mirror it, but do not feed it back into `initialConfig.viewport`
	 * or drive the view from it; the canvas owns the live camera and programmatic
	 * moves go through `ref.current.viewport`.
	 */
	onViewportChange?: (viewport: Camera) => void;
	/**
	 * Called when either sidebar opens, closes, or has a section collapsed, with
	 * both edges and every panel's state each time. Read-only on the same terms
	 * as `onViewportChange`: persist it and hand it back through
	 * `initialConfig.sidebars` at the next mount, but do not drive the panels
	 * from it — they are the user's, and there is no controlled prop.
	 */
	onSidebarsChange?: (sidebars: CanvasSidebarsState) => void;

	// ── Delegated to the host ──
	/**
	 * When provided, Ctrl+Z goes here instead of the internal undo stack (a
	 * VSCode host forwards it to the editor).
	 */
	onUndo?: () => void;
	/** When provided, Ctrl+Shift+Z / Ctrl+Y goes here instead of the internal redo stack. */
	onRedo?: () => void;
	/**
	 * When provided, the export dialog delivers the image here instead of
	 * triggering a browser download (a host that owns file saving, such as the
	 * VSCode extension writing into the workspace).
	 */
	onExportImage?: (payload: CanvasExportImagePayload) => void;
	/**
	 * Called when "open reference" is pressed for an object carrying
	 * `meta.reference`, from the ObjectMenu or the property sidebar's Meta
	 * section. Omit it and neither offers the button. The reference is passed
	 * through untouched: the canvas neither resolves nor validates it.
	 */
	onOpenReference?: (payload: OpenReferencePayload) => void;
	/**
	 * Reads the bytes of the file an `image` object names, its `src` passed
	 * through untouched. Omit it and every image draws as a placeholder; a
	 * rejected promise draws the placeholder for that one file. Resolutions are
	 * kept per `src` and the function is read through a ref, so a new function
	 * each render costs nothing and discards nothing: to fetch a `src` again,
	 * change the `src`.
	 */
	resolveImage?: ResolveImage;

	// ── Appearance & localization (live) ──
	/**
	 * Theme (default `darkCanvasTheme`). Appearance tokens reach styles as
	 * `--jiscribe-*` CSS custom properties on the canvas root; handle dimensions
	 * and the default font are distributed via context. A VSCode host passes
	 * tokens holding `var(--vscode-...)` values to follow the editor theme.
	 */
	theme?: CanvasTheme;
	/**
	 * Background grid. Omit for no grid, `{ show: true }` to display it. Its line
	 * color is not a setting: it is derived from the effective surface (theme
	 * background, or the doc's `background`) so it stays readable on any color.
	 * An inline object literal defeats `<Canvas>`'s memo; `useMemo` it.
	 */
	grid?: {
		/**
		 * Whether to render the grid (default `false`). A viewing aid only: it is
		 * never part of an exported image.
		 */
		show?: boolean;
		/**
		 * Base spacing in world units (default `25`). Bold lines fall every 4× this
		 * value and the multi-level grid adapts to zoom. Ignored while hidden.
		 */
		size?: number;
	};
	/**
	 * Active locale (default `"en"`). Selects the built-in dictionary (en / ja)
	 * and each command's own label dictionary, and is exposed to plugins via
	 * `useCanvasLocale` so they can resolve theirs. Resolution is exact →
	 * language subtag (`"ja-JP"` → `"ja"`) → `"en"`, per dictionary, so a plugin
	 * that ships no `ja` falls back to its own English rather than dragging the
	 * canvas back to English.
	 */
	locale?: string;
	/**
	 * Partial overrides on top of the locale-resolved dictionary (tooltips,
	 * menus, toasts). Tweaks individual strings; `locale` picks the language.
	 * They outrank a contributed command's own label as well as the built-ins,
	 * named by command id under `commandLabels`.
	 */
	messages?: Partial<CanvasMessages>;

	// ── Chrome ──
	/**
	 * Toolbar visibility and composition. An inline object literal defeats
	 * `<Canvas>`'s memo; `useMemo` it.
	 */
	toolbar?: {
		/**
		 * Whether to render the toolbar (default `true`). `false` removes the whole
		 * bar — zoom controls, the help button, the sidebar controls and any host
		 * `slot` items — and the canvas area takes the full height. Keyboard
		 * shortcuts still work (`?` opens the shortcut help, rendered outside the
		 * bar). The bottom tool bar is separate (`bottomToolbar.show`); with both
		 * hidden nothing is left to start drawing a new shape from, which suits
		 * read-mostly hosts (previews, embedded viewers).
		 */
		show?: boolean;
		/**
		 * Replaces the whole bar: sections of pinned presets, category flyouts,
		 * command buttons, the zoom group, the sidebar toggles, dividers and host
		 * UI slots (see {@link ToolbarSection}). Omit for
		 * {@link DEFAULT_TOOLBAR_SECTIONS}: undo / redo, the view controls, shortcut help,
		 * the toggles for each sidebar and the switch for both, and no preset — the
		 * presets are the bottom bar's (`bottomToolbar`). A host can reuse those
		 * sections one by one (`DEFAULT_TOOLBAR_HISTORY_SECTION` /
		 * `DEFAULT_TOOLBAR_VIEW_SECTION` / `DEFAULT_TOOLBAR_HELP_SECTION` /
		 * `DEFAULT_TOOLBAR_PER_SIDEBAR_TOGGLES_SECTION` /
		 * `DEFAULT_TOOLBAR_SIDEBARS_SECTION`) rather than restating them; host UI
		 * packed against the end belongs before the sidebar controls, which are
		 * meant to keep the far right. A host pinning presets here as well hides
		 * the bottom bar, or each preset shows twice.
		 *
		 * While either sidebar is open the sections make one full-width bar above
		 * the canvas; while both are closed, two pills floating over its top
		 * corners, which the canvas then fills to the top. Each section goes on
		 * the same side as on the full bar unless its `collapsedAlign` says
		 * otherwise, `"hidden"` hiding it.
		 */
		sections?: ToolbarSection[];
	};
	/**
	 * The bottom tool bar: a floating bar centred over the canvas at its bottom
	 * edge, holding pinned presets (click to arm or place, drag to place, as on
	 * the top bar) and an "Other shapes" button that is a placeholder for now and
	 * does nothing. It covers the canvas rather than shrinking it. While either
	 * sidebar is open it is hidden, the shape library holding the shapes; with
	 * no `stencilLibrary` declared it always shows. Omit for the
	 * default, shown with `DEFAULT_BOTTOM_TOOLBAR_PRESET_IDS`; see
	 * {@link BottomToolbarOptions}. An inline object literal defeats `<Canvas>`'s
	 * memo; `useMemo` it.
	 */
	bottomToolbar?: BottomToolbarOptions;
	/**
	 * The shape library sidebar. Omit and neither the sidebar nor its toolbar
	 * toggle is rendered.
	 */
	stencilLibrary?: {
		/**
		 * Sections in display order. Each section lists its presets by id; an id
		 * naming no registered preset is skipped and a section left empty is
		 * dropped. Two sections sharing an `id`, or one section naming the same
		 * preset id twice, throws rather than rendering a section or an item that
		 * cannot be told from its twin.
		 */
		sections: StencilCategory[];
	};

	// ── Interaction with the host page ──
	/**
	 * Focus the canvas on mount so keyboard shortcuts work immediately (default
	 * `true`). Shortcuts are scoped to the focused canvas; set `false` when
	 * embedding several canvases, or when the host manages focus, so mounting
	 * does not steal it.
	 */
	autoFocus?: boolean;
	/**
	 * How the canvas shares gestures with the page embedding it
	 * ({@link CanvasGestureHandling}), default `"greedy"`. `"cooperative"` is for a
	 * canvas inside a scrolling document: the wheel and a one-finger background
	 * drag move the page past it, a one-finger drag on a shape still drags the
	 * shape, and the view pans with two fingers. Zooming (Ctrl+wheel, pinch, the
	 * toolbar) works under either value. Live, so a host can hand the canvas the
	 * gestures on an explicit opt-in (a click, an "interact" button).
	 */
	gestureHandling?: CanvasGestureHandling;

	// ── Mount-time setup ──
	/**
	 * Per-canvas configuration read **once at mount** ({@link CanvasConfig}): the
	 * capability set (object types, commands, plugins) plus the initial camera
	 * (`viewport`), how far it may be scrolled (`scrollBounds`), and how the two
	 * sidebars start out (`sidebars`, the counterpart of `onSidebarsChange`).
	 * Omit for the full default set. Later changes are ignored; to reconfigure,
	 * remount with a new React `key`.
	 *
	 * `viewport` and `scrollBounds` outrank the document's own `view.open` /
	 * `view.scroll`, so pass them only when the host genuinely knows better (a
	 * restored session, a deep link) and leave them out otherwise. `sidebars`
	 * competes with nothing: no document declares the editor chrome.
	 *
	 * When `objectTypes` is restricted, an object of a type left out is held as
	 * an opaque object: kept in place and written back on save, but not drawn
	 * (see `canvasToState`).
	 */
	initialConfig?: CanvasConfig;
	/**
	 * Receives the imperative handle ({@link CanvasHandle}), grouped by
	 * subsystem: `viewport` to move pan/zoom, `selection` to select objects,
	 * `export` to get the exported image, and `measure` / `history` /
	 * `interaction` to read back how the canvas drew what it was given.
	 */
	ref?: React.Ref<CanvasHandle>;
};

const CanvasComponent = ({
	doc,
	docLoadId,
	syncNonce,
	onCommit,
	onSelectionChange,
	onViewportChange,
	onSidebarsChange,
	onUndo,
	onRedo,
	onExportImage,
	onOpenReference,
	resolveImage,
	theme = darkCanvasTheme,
	grid,
	locale = "en",
	messages,
	toolbar,
	bottomToolbar,
	stencilLibrary,
	autoFocus = true,
	gestureHandling = "greedy",
	initialConfig,
	ref,
}: CanvasProps) => {
	const mergedMessages = useMemo(
		() => resolveCanvasMessages(locale, messages),
		[locale, messages],
	);

	const themeCssVars = useMemo(
		() => buildThemeCssVars(theme.tokens),
		[theme.tokens],
	);

	// rootRef spans toolbar + canvas area and carries pointer capture; canvasRef
	// is the canvas area alone, which keeps edge scrolling aligned to the region
	// below the full-width toolbar (the collapsed toolbar's pills float inside
	// it).
	const rootRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);

	// Canvas is the registries provider, so its own hooks take `registries` as an
	// argument: reading the context here yields the default, missing plugin types.
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
		initialConfig?.viewport,
		initialConfig?.scrollBounds,
		initialConfig?.sidebars,
	);

	// Boxes derived from their content are re-measured through the reducer, the
	// one pass the slots cannot ask for; the counter covers the sites that measure
	// while they render instead (see useDocFonts).
	const { fontsNonce, isContentHidden } = useDocFonts({
		collectRequests: () =>
			collectDocFontRequests(state.objects, registries.objectTextStyleDefaults),
		onFacesChanged: () => {
			// First, so the re-measure is not answered from a measurement cached
			// against the fallback face.
			advanceTextMeasurementGeneration();
			dispatch({ type: "REMEASURE_TEXT" });
		},
	});

	// The files the document names, fetched once each. A shape component is
	// synchronous, so the awaiting happens here and reaches the rendering layer as
	// a lookup (see useDocImages).
	const { lookupResolvedImage, resolveImageBlob } = useDocImages(
		state.objects,
		resolveImage,
	);

	// Single toast slot shared by every error source (clipboard, export).
	const { errorNotification, notifyError } = useErrorNotification();

	useClipboardWrite(state.internalClipboard, notifyError);

	const {
		pointerHandlers,
		wheelHandler,
		resetGestureState,
		processPendingGestures,
	} = useGestureRecognizer({
		dispatch,
		containerRef: rootRef,
		svgRef,
		canvasState: state,
		gestureHandling,
	});

	// Shared between the save-delivery and external-sync hooks so overlapping saves that
	// fold back out of order are still recognized as self-saves (#29).
	const selfSaveNonceTracker = useSelfSaveNonceTracker();

	useNotifySelectionChange(state.selection.objectIds, onSelectionChange);

	useNotifyViewportChange(state.viewport, onViewportChange);

	useNotifySidebarsChange(
		state.stencilLibraryPanel,
		state.propertyPanel,
		onSidebarsChange,
	);

	useNotifySaveRequest(state, onCommit, selfSaveNonceTracker, registries);

	useSyncExternalDoc({
		canvasDoc: doc,
		syncNonce,
		docLoadId,
		canvasState: state,
		dispatch,
		resetGestureState,
		selfSaveNonceTracker,
		registries,
	});

	// Scoped to canvasRef so wheel events outside the canvas are not captured.
	useCanvasWheel(canvasRef, wheelHandler, gestureHandling);

	// The chrome around the drawing region (toolbar, sidebars, modals) is outside
	// that scope, so a Ctrl+wheel there would zoom the browser instead.
	useBlockBrowserZoom(rootRef);

	// Cooperative: a touch starting on a shape stays a shape drag instead of
	// becoming a page scroll (browsers ignore touch-action on inner SVG elements).
	useCooperativeTouchClaim(rootRef, gestureHandling);

	const { librarySections, resolveLibraryPreset } = useResolvedStencilLibrary(
		stencilLibrary?.sections,
		registries,
	);
	// One answer for the bar's library toggle, the panel's mount, the toolbar's
	// form, the bottom bar's mount and, through the reducer, the sidebars switch.
	const hasStencilLibrary = librarySections.length > 0;
	useSyncStencilLibraryAvailability(hasStencilLibrary, dispatch);

	// Both sidebars take their width out of the viewport, and the full-width
	// toolbar its height while either is open, so any of them coming or going has
	// to be re-measured before the next paint. Whether both sidebars count as
	// closed (the toolbar's form, and whether the bottom bar shows) is read
	// with the local `hasStencilLibrary`, as the library panel mounts from: the
	// reducer's copy arrives a commit later, and a first measurement taken
	// without the bar would turn its arrival into a camera shift.
	const areBothSidebarsClosed = !isAnySidebarOpen({
		...state,
		hasStencilLibrary,
	});
	useContainerResize(
		canvasRef,
		dispatch,
		`${state.stencilLibraryPanel.isOpen}:${state.propertyPanel.isOpen}:${areBothSidebarsClosed}`,
	);

	// The document's own framing intent, applied only where the host expressed
	// none: `initialConfig.viewport` is a camera the host already decided on, and
	// it outranks whatever the document would have asked for.
	useInitialViewOpen({
		view: initialConfig?.viewport === undefined ? state.view : undefined,
		containerRef: canvasRef,
		viewportSize: state.viewport,
		objects: state.objects,
		visualExtentRegistries: registries,
		dispatch,
	});

	const handlePaste = useClipboardPaste(
		state.internalClipboard,
		dispatch,
		registries,
	);

	// Stable so ContextMenu's memo holds.
	const contextMenuCallbacks = useMemo(
		() => ({ paste: handlePaste }),
		[handlePaste],
	);

	// Scoped to the focusable canvas root, so with several Canvases on a page only the
	// focused one handles shortcuts.
	useKeyboardShortcuts({
		containerRef: rootRef,
		canvasState: state,
		dispatch,
		callbacks: { undo: onUndo, redo: onRedo, paste: handlePaste },
		processPendingGestures,
		registries,
	});

	// Initial focus plus reclaiming it when it silently falls to body because the focused
	// element unmounted.
	useCanvasFocusScope(rootRef, autoFocus);

	const {
		handleStyleIntent,
		handleTransformUpdate,
		handleDocumentUpdate,
		handleMetaUpdate,
	} = usePropertyUpdaters(dispatch);

	// The host callback is read through a ref, so passing a new function each
	// render does not defeat the memo of ObjectMenu or PropertyPanel. Only adding
	// or removing the prop changes the identity, which is also what decides
	// whether the button shows.
	const onOpenReferenceRef = useLatestRef(onOpenReference);
	const hasOpenReferenceHandler = onOpenReference !== undefined;
	const handleOpenReference = useMemo<OpenReferenceHandler | undefined>(
		() =>
			hasOpenReferenceHandler
				? (payload) => onOpenReferenceRef.current?.(payload)
				: undefined,
		[hasOpenReferenceHandler, onOpenReferenceRef],
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

	const {
		draftObjects,
		textEditObjectId,
		editingTextSlotId,
		menuCanvasState,
		editorHandlers,
	} = useTextEditSession({ canvasState: state, dispatch, registries });

	// The sidebar stays on screen through every pan and drag, unlike the ObjectMenu,
	// which hides itself while the view moves; so its memo is protected here instead,
	// by handing it the same state object until something it shows has changed.
	const propertyPanelState = usePropertyPanelState(menuCanvasState);

	const movePreview =
		state.drag?.kind === "move" ? state.drag.movePreview : undefined;
	const drawingPresetId =
		state.mode.kind === "draw" ? state.mode.preset.id : null;
	// Only objects intersecting the visible world rect are rendered (#212). Export clones
	// the live SVG DOM, so it renders its own scope in place of that for the snapshot.
	const culledObjectIds = useVisibleObjectIds(
		state.objects,
		state.rootIds,
		state.viewport,
		textEditObjectId,
		registries,
		movePreview,
	);
	// Read by the text overlays, which stop drawing text too small to read; a
	// snapshot lifts that for as long as it clones the SVG.
	const canvasZoomStore = useCanvasZoomStore(state.viewport.zoom);
	const { snapshotRenderScope, withSnapshotRenderScope } =
		useSnapshotRenderScope(canvasZoomStore);
	const renderedObjectIds = resolveRenderedObjectIds(
		snapshotRenderScope,
		culledObjectIds,
	);

	const canvasHandle = useCanvasHandle({
		dispatch,
		canvasState: state,
		registries,
		svgRef,
		withSnapshotRenderScope,
		resolveImageBlob,
	});
	const handleExportSubmit = useExportDialog({
		svgRef,
		canvasState: state,
		registries,
		onExportImage,
		dispatch,
		notifyError,
		withSnapshotRenderScope,
		resolveImageBlob,
	});

	useImperativeHandle(ref, () => canvasHandle, [canvasHandle]);

	// Every layer that positions itself from the camera takes this one (see
	// useDevicePixelSnappedViewport).
	const drawnViewport = useDevicePixelSnappedViewport(state.viewport);
	const { minX, minY, zoom } = drawnViewport;

	const toolbarSections = toolbar?.sections ?? DEFAULT_TOOLBAR_SECTIONS;

	// What the bar's command buttons read to draw themselves disabled. A plain
	// closure, not memoized: `state` changes on nearly every dispatch (see
	// useCommandState).
	const resolveToolbarCommandState = (commandId: string) =>
		resolveCommandState(state, registries, commandId);

	// One element for both forms of the bar; where it is mounted depends on the
	// form (see the two places below).
	const toolbarElement =
		toolbar?.show !== false ? (
			<ToolbarCommandStateContext value={resolveToolbarCommandState}>
				<Toolbar
					activePresetId={drawingPresetId}
					openCategoryId={state.stencilLibraryOpenCategory}
					zoom={state.viewport.zoom}
					sections={toolbarSections}
					hasLibrary={hasStencilLibrary}
					isLibraryOpen={state.stencilLibraryPanel.isOpen}
					isPropertyPanelOpen={state.propertyPanel.isOpen}
					isAnySidebarOpen={!areBothSidebarsClosed}
				/>
			</ToolbarCommandStateContext>
		) : null;

	// null while the host hid the bar. Memoized so BottomToolbar keeps its memo:
	// the canvas re-renders on nearly every dispatch.
	const bottomToolbarPresets = useMemo(
		() => resolveBottomToolbarPresets(bottomToolbar, registries.stencil),
		[bottomToolbar, registries],
	);

	return (
		<CanvasProviders
			theme={theme}
			locale={locale}
			messages={mergedMessages}
			registries={registries}
			fontsNonce={fontsNonce}
			zoomStore={canvasZoomStore}
			lookupResolvedImage={lookupResolvedImage}
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
				{/* Expanded, the full-width bar takes its row above the body */}
				{!areBothSidebarsClosed && toolbarElement}
				<CanvasBody>
					{state.stencilLibraryPanel.isOpen && hasStencilLibrary && (
						<StencilLibraryPanel
							sections={librarySections}
							collapsedSectionIds={
								state.stencilLibraryPanel.collapsedSectionIds
							}
							activePresetId={drawingPresetId}
							resolvePreset={resolveLibraryPreset}
						/>
					)}
					<Viewport
						data-id="canvas"
						data-kind="canvas"
						ref={canvasRef}
						cursor={drawingPresetId !== null ? "crosshair" : undefined}
					>
						<Container>
							<CanvasView
								objects={draftObjects}
								rootIds={state.rootIds}
								viewport={drawnViewport}
								svgRef={svgRef}
								isContentHidden={isContentHidden}
								textEditObjectId={textEditObjectId}
								editingTextSlotId={editingTextSlotId}
								isDrawMode={drawingPresetId !== null}
								renderedObjectIds={renderedObjectIds}
								movePreview={movePreview}
								showGrid={grid?.show}
								gridSize={grid?.size}
								background={state.background}
								surfaceColor={theme.tokens.canvasBg}
							>
								<CanvasControlLayers
									canvasState={state}
									draftObjects={draftObjects}
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
									mode={state.mode}
									selection={state.selection}
									objects={draftObjects}
									{...editorHandlers}
								/>
							</ZoomScaledOverlay>
							{/* HTML whose position follows zoom but whose size does not */}
							<ScrollSyncedOverlay
								style={{ left: -minX * zoom, top: -minY * zoom }}
							>
								<ObjectMenu
									canvasState={menuCanvasState}
									onStyleIntent={handleStyleIntent}
									onOpenReference={handleOpenReference}
								/>
							</ScrollSyncedOverlay>
						</Container>
						{/* When it shows: see the `bottomToolbar` prop. Inside the
						    viewport, so it covers the canvas rather than shrinking it;
						    before the overlay, so the context menu and the toast draw over
						    it */}
						{bottomToolbarPresets !== null &&
							(areBothSidebarsClosed || !hasStencilLibrary) && (
								<BottomToolbar
									presets={bottomToolbarPresets}
									activePresetId={drawingPresetId}
								/>
							)}
						{/* Collapsed, the bar's two pills float over the top corners,
						    placed here for the same reasons as the bottom bar */}
						{areBothSidebarsClosed && toolbarElement}
						<ViewportOverlay>
							<ErrorToast notification={errorNotification} />
							<ContextMenu
								position={state.contextMenuPosition}
								canvasState={state}
								callbacks={contextMenuCallbacks}
							/>
						</ViewportOverlay>
					</Viewport>
					{state.propertyPanel.isOpen && (
						<PropertyPanel
							canvasState={propertyPanelState}
							onStyleIntent={handleStyleIntent}
							onTransformUpdate={handleTransformUpdate}
							onDocumentUpdate={handleDocumentUpdate}
							onMetaUpdate={handleMetaUpdate}
							onOpenReference={handleOpenReference}
						/>
					)}
				</CanvasBody>
				{/* Every modal is rendered here, as a sibling of the toolbar/body row, so
				    its backdrop covers the whole canvas including both bars */}
				{state.activeModal === "export" && (
					<ExportDialog
						defaultMargin={EXPORT_FIT_PADDING}
						canExportSelection={state.selection.objectIds.length > 0}
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
