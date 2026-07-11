import {
	memo,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";

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
import { useCanvasFocusScope } from "./hooks/useCanvasFocusScope";
import { useCanvasReducer } from "./hooks/useCanvasReducer";
import { useCanvasWheel } from "./hooks/useCanvasWheel";
import { useClipboardPaste } from "./hooks/useClipboardPaste";
import { useClipboardWrite } from "./hooks/useClipboardWrite";
import { resolveCommandState } from "./hooks/useCommandState";
import { useContainerResize } from "./hooks/useContainerResize";
import { useControlledViewport } from "./hooks/useControlledViewport";
import { useGestureRecognizer } from "./hooks/useGestureRecognizer";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useNotifySaveRequest } from "./hooks/useNotifySaveRequest";
import { useNotifySelectionChange } from "./hooks/useNotifySelectionChange";
import { useNotifyViewportChange } from "./hooks/useNotifyViewportChange";
import { useSelfSaveNonceTracker } from "./hooks/useSelfSaveNonceTracker";
import { useSyncExternalDoc } from "./hooks/useSyncExternalDoc";
import { mergeCanvasMessages } from "./messages/CanvasMessages";
import type { CanvasMessages } from "./messages/CanvasMessages";
import { CanvasMessagesContext } from "./messages/CanvasMessagesContext";
import { createCanvasRegistries, defaultCanvasRegistries } from "./setup";
import type { CanvasConfig } from "./setup";
import {
	canvasToSvgString,
	exportCanvasToPng,
	exportCanvasToSvg,
	rasterizeSvgToPngBlob,
} from "../export";
import { CanvasView } from "../presentations/CanvasView";
import { ObjectComponentRegistryContext } from "../presentations/objects/registry/ObjectComponentRegistryContext";
import { canvasToDoc } from "../states/canvas/CanvasMapper";
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
import { ClipboardErrorToast } from "./ui/feedback/ClipboardErrorToast";
import { DragGhost } from "./ui/feedback/DragGhost";
import { DrawingPreviewOverlay } from "./ui/feedback/DrawingPreviewOverlay";
import { PendingConnectorOverlay } from "./ui/feedback/PendingConnectorOverlay";
import { SelectionOverlay } from "./ui/feedback/SelectionOverlay";
import { SnapGuides } from "./ui/feedback/SnapGuides";
import { ContextMenu } from "./ui/menu/ContextMenu";
import { ExportDialog } from "./ui/menu/ExportDialog";
import type {
	ExportImageFormat,
	ExportSubmitValues,
} from "./ui/menu/ExportDialog";
import { ObjectMenu } from "./ui/menu/ObjectMenu";
import { Toolbar } from "./ui/menu/Toolbar";
import { calcContentBounds } from "./utils/calcContentBounds";
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
	 * Host-controlled camera (pan + zoom). Its value is applied whenever it
	 * changes, letting the host set the view at any time (fit-to-screen, restore a
	 * saved view, …). Omit to leave the viewport uncontrolled (default); pair with
	 * `onViewportChange` to keep the host's copy in sync.
	 */
	viewport?: Camera;
	/**
	 * Invoked when the camera (pan/zoom) changes — on internal gestures and on
	 * programmatic `viewport` changes (not on container resize). Use it to persist
	 * or mirror the view.
	 */
	onViewportChange?: (viewport: Camera) => void;
	/**
	 * Host UI inserted at the left edge of the toolbar (e.g. save/open buttons).
	 * Rendered inside a `data-gesture="none"` container, so plain `onClick` works.
	 */
	toolbarLeading?: React.ReactNode;
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

/**
 * Default margin (world px) kept around the content in exported images. Also
 * absorbs extents the content bounds do not account for (stroke widths, arrow
 * heads). The export dialog and {@link CanvasExportOptions} can override it.
 */
const EXPORT_FIT_PADDING = 16;

/**
 * Per-export options shared by the {@link CanvasExportHandle} methods.
 */
export type CanvasExportOptions = {
	/**
	 * Margin (world px) kept around the content, replacing the default (16).
	 */
	margin?: number;
	/**
	 * Whether to embed the `.jis.json` source in the image (default true),
	 * making the file re-editable. Without the source, the default download
	 * name drops the `.jis` marker (plain `.png` / `.svg`).
	 */
	includeSource?: boolean;
	/**
	 * Whether to skip the background fill (default false), producing an
	 * alpha-transparent image instead of the theme's canvas background.
	 */
	transparentBackground?: boolean;
};

/**
 * Imperative export API exposed via the `exportRef` prop. Hosts that need
 * image bytes programmatically (e.g. the VSCode extension re-rendering a
 * `.jis.png` / `.jis.svg` on save) use this to run the exact same export
 * pipeline as the export dialog (fit-to-content, source embedding).
 */
export type CanvasExportHandle = {
	/**
	 * Builds the self-contained editable SVG string (`.jis.svg` content).
	 * Returns null when the canvas is not mounted yet.
	 */
	toSvgString(options?: CanvasExportOptions): string | null;
	/**
	 * Rasterizes the canvas to a PNG Blob with the `.jis.json` source
	 * embedded as an iTXt chunk. Returns null when the canvas is not
	 * mounted yet.
	 */
	toPngBlob(options?: CanvasExportOptions): Promise<Blob | null>;
};

/**
 * Exported image handed to {@link CanvasProps.onExportImage}: the encoded
 * bytes plus what the host needs to derive a file name.
 */
export type CanvasExportImagePayload = {
	format: ExportImageFormat;
	/** Encoded image bytes (PNG, or serialized SVG text) */
	data: Blob;
	/** Whether the `.jis.json` source is embedded (re-editable image) */
	includesSource: boolean;
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
	viewport: controlledViewport,
	onViewportChange,
	toolbarLeading,
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

	// Reducer for canvas state management with history. The controlled camera (if
	// any) seeds the initial viewport so the first paint is already at the host's
	// pan/zoom — see useCanvasReducer / useControlledViewport for the mount handoff.
	const [state, dispatch] = useCanvasReducer(
		canvasDoc,
		registries,
		docDefaults,
		controlledViewport,
	);

	// Keep the reducer-held docDefaults in sync when the host swaps themes at
	// runtime (the reducer no-ops when the values are unchanged).
	useEffect(() => {
		dispatch({ type: "SET_DOC_DEFAULTS", docDefaults });
	}, [docDefaults, dispatch]);

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

	// Apply a host-controlled camera (when the `viewport` prop is provided) and
	// notify the host of camera changes. Together these make the viewport an
	// optional controlled value: internal gestures stay authoritative and are
	// reported out, while the host can set pan/zoom at any time.
	useControlledViewport(controlledViewport, dispatch);
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

	// Shared options of the SVG/PNG export: the .jis.json source and a
	// fit-to-content viewBox (content bounds + margin), so the image is
	// independent of the current pan/zoom and window size. An empty canvas
	// falls back to exporting the current view.
	const buildExportOptions = useCallback(
		({
			margin = EXPORT_FIT_PADDING,
			includeSource = true,
			transparentBackground = false,
		}: CanvasExportOptions = {}) => {
			const bounds = calcContentBounds(state.objects);
			return {
				source: includeSource
					? canvasToDoc(state, registries.objectMapper)
					: undefined,
				// "transparent" skips the background rect (buildExportSvg);
				// undefined falls back to the live theme background
				background: transparentBackground ? "transparent" : undefined,
				viewBox: bounds
					? {
							x: bounds.left - margin,
							y: bounds.top - margin,
							width: bounds.right - bounds.left + margin * 2,
							height: bounds.bottom - bounds.top + margin * 2,
						}
					: undefined,
			};
		},
		[state, registries],
	);

	// Imperative export API for hosts (same pipeline as the export dialog)
	useImperativeHandle(
		exportRef,
		() => ({
			toSvgString: (options?: CanvasExportOptions) => {
				const svg = svgRef.current;
				return svg ? canvasToSvgString(svg, buildExportOptions(options)) : null;
			},
			toPngBlob: async (options?: CanvasExportOptions) => {
				const svg = svgRef.current;
				return svg
					? rasterizeSvgToPngBlob(svg, buildExportOptions(options))
					: null;
			},
		}),
		[buildExportOptions],
	);

	// Export dialog (opened from the context menu): pick format + margin, OK
	const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
	const closeExportDialog = useCallback(() => setIsExportDialogOpen(false), []);
	const openExportDialog = useCallback(() => {
		dispatch({ type: "CLOSE_CONTEXT_MENU" });
		setIsExportDialogOpen(true);
	}, [dispatch]);

	// Runs the chosen export (with source: SVG embeds the .jis.json in
	// <metadata>, PNG in an iTXt chunk; without: a plain image). The result is
	// handed to the host via onExportImage when set, downloaded otherwise.
	const handleExportSubmit = useCallback(
		(values: ExportSubmitValues) => {
			setIsExportDialogOpen(false);
			const svg = svgRef.current;
			if (!svg) {
				return;
			}
			const exportOptions = buildExportOptions(values);
			if (onExportImage) {
				const deliver = (data: Blob) =>
					onExportImage({
						format: values.format,
						data,
						includesSource: values.includeSource,
					});
				if (values.format === "svg") {
					const svgText = canvasToSvgString(svg, exportOptions);
					deliver(new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }));
				} else {
					rasterizeSvgToPngBlob(svg, exportOptions).then(
						deliver,
						(err: unknown) => {
							console.error("[Canvas] PNG export failed:", err);
						},
					);
				}
				return;
			}
			if (values.format === "svg") {
				exportCanvasToSvg(svg, exportOptions);
			} else {
				void exportCanvasToPng(svg, exportOptions);
			}
		},
		[buildExportOptions, onExportImage],
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
		<CanvasThemeContext value={theme}>
			<CanvasMessagesContext value={mergedMessages}>
				<CanvasRegistriesContext value={registries}>
					<ObjectComponentRegistryContext value={registries.objectComponent}>
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
									zoom={state.viewport.zoom}
									canZoomIn={canZoomIn}
									canZoomOut={canZoomOut}
									leading={toolbarLeading}
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
											<DrawingPreviewOverlay
												shapeDrawing={state.shapeDrawing}
											/>
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
										<ClipboardErrorToast
											errorVersion={clipboardWriteErrorVersion}
										/>
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
					</ObjectComponentRegistryContext>
				</CanvasRegistriesContext>
			</CanvasMessagesContext>
		</CanvasThemeContext>
	);
};
export const Canvas = memo(CanvasComponent);
