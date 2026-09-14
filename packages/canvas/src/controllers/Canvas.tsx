import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { RichText } from "@jiscribe/doc/model/objects/types/RichText";
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
	CanvasBody,
	CanvasRoot,
	Container,
	ScrollSyncedOverlay,
	Viewport,
	ViewportOverlay,
	ZoomScaledOverlay,
} from "./CanvasStyled";
import type { Camera } from "./CanvasTypes";
import { isGestureOptedOut } from "./gestures/recognizer/targeting/isGestureOptedOut";
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
import { useNotifyViewportChange } from "./hooks/useNotifyViewportChange";
import { useRevealTextEditCaret } from "./hooks/useRevealTextEditCaret";
import { useSelfSaveNonceTracker } from "./hooks/useSelfSaveNonceTracker";
import { useSyncExternalDoc } from "./hooks/useSyncExternalDoc";
import { useViewportCulling } from "./hooks/useViewportCulling";
import { resolveCanvasMessages } from "./messages/CanvasMessages";
import type { CanvasMessages } from "./messages/CanvasMessagesTypes";
import { createCanvasRegistries, defaultCanvasRegistries } from "./registries";
import type { CanvasConfig } from "./registries";
import type { ResolveImageHref } from "../export";
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
import type {
	StylePropertyUpdater,
	OpenReferenceHandler,
	OpenReferencePayload,
} from "./ui/menu/ObjectMenu/ObjectMenuTypes";
import { PropertyPanel } from "./ui/menu/PropertyPanel/PropertyPanel";
import type {
	PropertyPanelDocumentUpdater,
	PropertyPanelMetaUpdater,
	PropertyPanelTransformUpdater,
} from "./ui/menu/PropertyPanel/PropertyPanelTypes";
import { StencilLibraryPanel } from "./ui/menu/StencilLibrary/StencilLibraryPanel";
import { resolveStencilCategories } from "./ui/menu/StencilLibrary/utils/resolveStencilCategory";
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
import { graftTextEditDraft } from "./utils/graftTextEditDraft";
import { EXPORT_FIT_PADDING } from "./utils/resolveExportOptions";
import { resolveSelectedTextSlot } from "./utils/resolveSelectedTextSlot";
import { snapViewportToDevicePixels } from "./utils/snapViewportToDevicePixels";
import type { TextEditFormat } from "./utils/toggleTextEditFormat";

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
	 * `meta.reference`. Omit it and the menu item is never offered. The reference
	 * is passed through untouched: the canvas neither resolves nor validates it.
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
	 * and is exposed to plugins via `useCanvasLocale`. Resolution is exact →
	 * language subtag (`"ja-JP"` → `"ja"`) → `"en"`.
	 */
	locale?: string;
	/**
	 * Partial overrides on top of the locale-resolved dictionary (tooltips,
	 * menus, toasts). Tweaks individual strings; `locale` picks the language.
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
		 * bar — shape tools, zoom controls, the help button and any host `slot`
		 * items — and the canvas area takes the full height. Keyboard shortcuts
		 * still work (`?` opens the shortcut help, rendered outside the bar), but
		 * nothing is left to start drawing a new shape from, so this suits
		 * read-mostly hosts (previews, embedded viewers).
		 */
		show?: boolean;
		/**
		 * Replaces the whole bar: sections of pinned presets, category flyouts,
		 * command buttons, the zoom group, the two sidebar toggles, dividers and
		 * host UI slots (see {@link ToolbarSection}). Omit for
		 * {@link DEFAULT_TOOLBAR_SECTIONS}, which pins every core preset directly
		 * and opens no flyout — anything a plugin supplies must be named here by
		 * the host, which can reuse the default's other three sections
		 * (`DEFAULT_TOOLBAR_HISTORY_SECTION` / `DEFAULT_TOOLBAR_VIEW_SECTION` /
		 * `DEFAULT_TOOLBAR_PROPERTIES_SECTION`) rather than restating them. Host UI
		 * packed against the end belongs before the properties section, which is
		 * meant to keep the far right.
		 */
		sections?: ToolbarSection[];
	};
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
	 * (`viewport`) and how far it may be scrolled (`scrollBounds`). Omit for the
	 * full default set. Later changes are ignored; to reconfigure, remount with a
	 * new React `key`.
	 *
	 * `viewport` and `scrollBounds` outrank the document's own `view.open` /
	 * `view.scroll`, so pass them only when the host genuinely knows better (a
	 * restored session, a deep link) and leave them out otherwise.
	 *
	 * When `objectTypes` is restricted, only pass docs whose object types remain
	 * enabled — otherwise state construction throws "Mapper not found"
	 * (docs/01-design-philosophy.md, principle 4).
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

	// rootRef spans toolbar + canvas area and carries pointer capture; canvasRef is the
	// canvas area alone, which keeps edge scrolling aligned to the region below the toolbar.
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
	);

	// Boxes derived from their content are re-measured through the reducer, the
	// one pass the slots cannot ask for; the counter covers the sites that measure
	// while they render instead (see useDocFonts).
	const { fontsNonce, isContentHidden } = useDocFonts({
		collectRequests: () =>
			collectDocFontRequests(state.objects, registries.objectTextStyleDefaults),
		onFacesChanged: () => {
			dispatch({ type: "REMEASURE_TEXT" });
		},
	});

	// The files the document names, fetched once each. A shape component is
	// synchronous, so the awaiting happens here and reaches the rendering layer as
	// a lookup (see useDocImages).
	const lookupResolvedImage = useDocImages(state.objects, resolveImage);

	// An export cannot carry the blob URL a live <image> draws from — it names
	// nothing outside this tab — so it takes the bytes themselves.
	const resolveImageHref = useCallback<ResolveImageHref>(
		(src) => {
			const resolved = lookupResolvedImage(src);
			return resolved.status === "ready" ? resolved.dataUri : undefined;
		},
		[lookupResolvedImage],
	);

	// Single toast slot shared by every error source (clipboard, export).
	const { errorNotification, notifyError } = useErrorNotification();

	useClipboardWrite(state.internalClipboard, notifyError);

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
		docLoadId,
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

	// Both sidebars take their width out of the viewport, so either one opening or
	// closing has to be re-measured before the next paint.
	useContainerResize(
		canvasRef,
		dispatch,
		`${state.stencilLibraryPanel.isOpen}:${state.propertyPanel.isOpen}`,
	);

	// The document's own framing intent, applied only where the host expressed
	// none: `initialConfig.viewport` is a camera the host already decided on, and
	// it outranks whatever the document would have asked for.
	useInitialViewOpen({
		view: initialConfig?.viewport === undefined ? state.view : undefined,
		containerRef: canvasRef,
		viewportSize: state.viewport,
		objects: state.objects,
		visualBounds: registries.objectVisualBounds,
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
		registries,
	});

	// Initial focus plus reclaiming it when it silently falls to body because the focused
	// element unmounted.
	useCanvasFocusScope(rootRef, autoFocus);

	const handleStylePropertyUpdate = useCallback<StylePropertyUpdater>(
		(property, value, commit, coalesceHistory = false) => {
			dispatch({
				type: "STYLE_PROPERTY_UPDATE",
				property,
				value,
				commit,
				coalesceHistory,
			});
		},
		[dispatch],
	);

	const handleTransformUpdate = useCallback<PropertyPanelTransformUpdater>(
		(property, value, commit, coalesceHistory = false) => {
			dispatch({
				type: "TRANSFORM_PROPERTY_UPDATE",
				property,
				value,
				commit,
				coalesceHistory,
			});
		},
		[dispatch],
	);

	const handleDocumentUpdate = useCallback<PropertyPanelDocumentUpdater>(
		(property, value, commit, coalesceHistory = false) => {
			dispatch({
				type: "DOCUMENT_PROPERTY_UPDATE",
				property,
				value,
				commit,
				coalesceHistory,
			});
		},
		[dispatch],
	);

	const handleMetaUpdate = useCallback<PropertyPanelMetaUpdater>(
		(property, value, commit, coalesceHistory = false) => {
			dispatch({
				type: "META_PROPERTY_UPDATE",
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
				registries.objectContentResizer,
			),
		[state.objects, state.textEditState, registries],
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

	// Editor handlers with stable identities: TextEditorLayer is memoized, and
	// TextEditor keys its native-listener effects on these, so inline literals
	// here would re-attach those listeners on every canvas dispatch mid-edit.
	const handleTextEditChange = useCallback(
		(text: RichText) => {
			dispatch({ type: "UPDATE_TEXT_EDIT", text });
		},
		[dispatch],
	);
	const handleTextEditEscape = useCallback(() => {
		dispatch({ type: "END_TEXT_EDIT", commit: false });
	}, [dispatch]);
	const handleTextEditSelectionChange = useCallback(
		(selection: { start: number; end: number }) => {
			dispatch({ type: "UPDATE_TEXT_EDIT_SELECTION", selection });
		},
		[dispatch],
	);
	const handleTextEditToggleFormat = useCallback(
		(format: TextEditFormat) => {
			dispatch({ type: "TOGGLE_TEXT_FORMAT", format });
		},
		[dispatch],
	);

	// Only objects intersecting the visible world rect are rendered (#212). Export clones
	// the live SVG DOM, so it suspends culling for the snapshot via withCullingSuspended.
	const { visibleObjectIds, withCullingSuspended } = useViewportCulling(
		state.objects,
		state.rootIds,
		state.viewport,
		state.textEditState?.objectId ?? null,
		registries.objectVisualBounds,
	);

	const canvasHandle = useCanvasHandle({
		dispatch,
		canvasState: state,
		registries,
		svgRef,
		withCullingSuspended,
		resolveImageHref,
	});
	const handleExportSubmit = useExportDialog({
		svgRef,
		canvasState: state,
		registries,
		onExportImage,
		dispatch,
		notifyError,
		withCullingSuspended,
		resolveImageHref,
	});

	useImperativeHandle(ref, () => canvasHandle, [canvasHandle]);

	// The committed camera moved onto the device pixel grid (see
	// snapViewportToDevicePixels). Every layer that positions itself from the
	// camera must take this one, or the SVG and the HTML overlays above it would
	// sit a fraction of a pixel apart.
	const devicePixelRatio = useDevicePixelRatio();
	const drawnViewport = useMemo(
		() => snapViewportToDevicePixels(state.viewport, devicePixelRatio),
		[state.viewport, devicePixelRatio],
	);
	const { minX, minY, zoom } = drawnViewport;

	const selectedTextSlot = resolveSelectedTextSlot(state);

	const toolbarSections = toolbar?.sections ?? DEFAULT_TOOLBAR_SECTIONS;

	// What the bar's command buttons read to draw themselves disabled. A plain
	// closure, not memoized: `state` changes on nearly every dispatch (see
	// useCommandState).
	const resolveToolbarCommandState = (commandId: string) =>
		resolveCommandState(state, registries, commandId);

	// Sections whose ids resolve to registered presets. Resolved here (not in the
	// panel) so an unmounted-but-declared library still decides whether the
	// sidebar can open at all.
	const librarySections = useMemo(
		() =>
			resolveStencilCategories(
				stencilLibrary?.sections ?? [],
				registries.stencil,
			),
		[stencilLibrary?.sections, registries],
	);

	return (
		<CanvasProviders
			theme={theme}
			locale={locale}
			messages={mergedMessages}
			registries={registries}
			fontsNonce={fontsNonce}
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
				{toolbar?.show !== false && (
					<ToolbarCommandStateContext value={resolveToolbarCommandState}>
						<Toolbar
							activePresetId={state.shapeDrawing?.preset.id ?? null}
							openCategoryId={state.stencilLibraryOpenCategory}
							zoom={state.viewport.zoom}
							sections={toolbarSections}
							hasLibrary={librarySections.length > 0}
							isLibraryOpen={state.stencilLibraryPanel.isOpen}
							isPropertyPanelOpen={state.propertyPanel.isOpen}
						/>
					</ToolbarCommandStateContext>
				)}
				<CanvasBody>
					{state.stencilLibraryPanel.isOpen && librarySections.length > 0 && (
						<StencilLibraryPanel
							sections={librarySections}
							collapsedSectionIds={
								state.stencilLibraryPanel.collapsedSectionIds
							}
							activePresetId={state.shapeDrawing?.preset.id ?? null}
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
								isContentHidden={isContentHidden}
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
									connectorDraft={state.connectorDraft}
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
									activeDragKind={state.activeDrag?.kind ?? null}
								/>
								<ConnectionAnchorsLayer
									selectedIds={state.selectedIds}
									objects={state.objects}
									zoom={state.viewport.zoom}
									connectorDraft={state.connectorDraft}
									isTextEditing={!!state.textEditState}
									activeDragKind={state.activeDrag?.kind ?? null}
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
								<DragGhost stencilLibraryDrag={state.stencilLibraryDrag} />
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
									onTextChange={handleTextEditChange}
									onEscape={handleTextEditEscape}
									onCaretMove={revealCaret}
									onSelectionChange={handleTextEditSelectionChange}
									onToggleFormat={handleTextEditToggleFormat}
								/>
							</ZoomScaledOverlay>
							{/* HTML whose position follows zoom but whose size does not */}
							<ScrollSyncedOverlay
								style={{ left: -minX * zoom, top: -minY * zoom }}
							>
								<ObjectMenu
									canvasState={menuCanvasState}
									onPropertyUpdate={handleStylePropertyUpdate}
									onOpenReference={handleOpenReference}
								/>
							</ScrollSyncedOverlay>
						</Container>
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
							canvasState={menuCanvasState}
							onPropertyUpdate={handleStylePropertyUpdate}
							onTransformUpdate={handleTransformUpdate}
							onDocumentUpdate={handleDocumentUpdate}
							onMetaUpdate={handleMetaUpdate}
						/>
					)}
				</CanvasBody>
				{/* Every modal is rendered here, as a sibling of the toolbar/body row, so
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
