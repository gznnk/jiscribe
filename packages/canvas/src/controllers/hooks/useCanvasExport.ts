import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Dispatch } from "react";

import {
	canvasToSvgString,
	exportCanvasToPng,
	exportCanvasToSvg,
	rasterizeSvgToPngBlob,
} from "../../export";
import type { BuildExportSvgOptions } from "../../export";
import { canvasToDoc } from "../../states/canvas/CanvasMapper";
import type { CanvasState } from "../../states/canvas/CanvasState";
import type { ObjectMapperRegistry } from "../../states/registry/ObjectMapperRegistry";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasAction } from "../reducer/CanvasActions";
import type { CanvasRegistries } from "../setup";
import type { NotifyError } from "./useErrorNotification";
import type {
	ExportImageFormat,
	ExportSubmitValues,
} from "../ui/modal/ExportDialog";
import { calcContentBounds } from "../utils/calcContentBounds";

/**
 * Default margin (world px) kept around the content in exported images. Also
 * absorbs extents the content bounds do not account for (stroke widths, arrow
 * heads). The export dialog and {@link CanvasExportOptions} can override it.
 */
export const EXPORT_FIT_PADDING = 16;

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
 * Imperative export API exposed on the `export` namespace of the Canvas handle
 * (`ref.current.export`). Hosts that need image bytes programmatically (e.g. the
 * VSCode extension re-rendering a `.jis.png` / `.jis.svg` on save) use this to
 * run the exact same export pipeline as the export dialog (fit-to-content,
 * source embedding).
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
 * Exported image handed to the `onExportImage` prop: the encoded bytes plus
 * what the host needs to derive a file name.
 */
export type CanvasExportImagePayload = {
	format: ExportImageFormat;
	/** Encoded image bytes (PNG, or serialized SVG text) */
	data: Blob;
	/** Whether the `.jis.json` source is embedded (re-editable image) */
	includesSource: boolean;
};

/**
 * Shared options of the SVG/PNG export: the .jis.json source and a
 * fit-to-content viewBox (content bounds + margin), so the image is
 * independent of the current pan/zoom and window size. An empty canvas
 * falls back to exporting the current view.
 */
export const resolveExportOptions = (
	state: Pick<CanvasState, "objects" | "rootIds">,
	objectMapper: ObjectMapperRegistry,
	{
		margin = EXPORT_FIT_PADDING,
		includeSource = true,
		transparentBackground = false,
	}: CanvasExportOptions = {},
): BuildExportSvgOptions => {
	const bounds = calcContentBounds(state.objects);
	// 水平/垂直の直線だけのキャンバス等では範囲が退化（幅または高さ 0）し、
	// マージン 0 だと viewBox が 0 になって空画像が出力されるため、最小
	// 1 world px を保証する（不足分は中央に配置して内容を帯の中心に置く）
	const rawWidth = bounds ? bounds.right - bounds.left + margin * 2 : 0;
	const rawHeight = bounds ? bounds.bottom - bounds.top + margin * 2 : 0;
	const width = Math.max(rawWidth, 1);
	const height = Math.max(rawHeight, 1);
	return {
		source: includeSource ? canvasToDoc(state, objectMapper) : undefined,
		// "transparent" skips the background rect (buildExportSvg);
		// undefined falls back to the live theme background
		background: transparentBackground ? "transparent" : undefined,
		viewBox: bounds
			? {
					x: bounds.left - margin - (width - rawWidth) / 2,
					y: bounds.top - margin - (height - rawHeight) / 2,
					width,
					height,
				}
			: undefined,
	};
};

/**
 * Runs the chosen export (with source: SVG embeds the .jis.json in
 * <metadata>, PNG in an iTXt chunk; without: a plain image). The result is
 * handed to the host via deliverToHost when set, downloaded otherwise.
 * Failures surface through notifyError (error toast).
 */
export const runExportSubmit = (
	svg: SVGSVGElement,
	values: ExportSubmitValues,
	exportOptions: BuildExportSvgOptions,
	deliverToHost: ((payload: CanvasExportImagePayload) => void) | undefined,
	notifyError: NotifyError,
): void => {
	const reportExportError = (err: unknown) => {
		console.error("[Canvas] Image export failed:", err);
		notifyError("exportImageError");
	};
	try {
		if (deliverToHost) {
			const deliver = (data: Blob) =>
				deliverToHost({
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
					reportExportError,
				);
			}
			return;
		}
		if (values.format === "svg") {
			exportCanvasToSvg(svg, exportOptions);
		} else {
			exportCanvasToPng(svg, exportOptions).catch(reportExportError);
		}
	} catch (err) {
		reportExportError(err);
	}
};

type UseCanvasExportParams = {
	/** The live canvas `<svg>` (null until CanvasView mounts) */
	svgRef: React.RefObject<SVGSVGElement | null>;
	canvasState: CanvasControllerState;
	registries: CanvasRegistries;
	onExportImage: ((payload: CanvasExportImagePayload) => void) | undefined;
	dispatch: Dispatch<CanvasAction>;
	notifyError: NotifyError;
	/**
	 * Runs the snapshot with viewport culling suspended (full object tree in
	 * the DOM), since every export path clones the live SVG. The synchronous
	 * part of the snapshot must complete the clone — for the PNG path this
	 * holds because rasterizeSvgToPngBlob serializes before its first await.
	 */
	withCullingSuspended: <T>(snapshot: () => T) => T;
};

type UseCanvasExportResult = {
	/** Export sub-handle assembled into the Canvas handle (`ref.current.export`) */
	exportHandle: CanvasExportHandle;
	isExportDialogOpen: boolean;
	/** Opens the export dialog (and closes the context menu it was invoked from) */
	openExportDialog: () => void;
	closeExportDialog: () => void;
	handleExportSubmit: (values: ExportSubmitValues) => void;
};

/**
 * Owns image export: the imperative export handle and the export dialog
 * (open state + submit). Export options are built from the state at export
 * time (not at render time), so the handle and all returned callbacks stay
 * referentially stable across state updates and unstable host callbacks.
 */
export const useCanvasExport = ({
	svgRef,
	canvasState,
	registries,
	onExportImage,
	dispatch,
	notifyError,
	withCullingSuspended,
}: UseCanvasExportParams): UseCanvasExportResult => {
	// Always-fresh mirror of the state, read at export time. Must be a layout
	// effect: the host can call the imperative handle synchronously right after
	// a commit, before passive effects run (same pattern as useNotifySaveRequest).
	const canvasStateRef = useRef(canvasState);
	useLayoutEffect(() => {
		canvasStateRef.current = canvasState;
	});

	// onExportImage goes through a ref so a host passing a new function each
	// render cannot re-create the submit handler.
	const onExportImageRef = useRef(onExportImage);
	useEffect(() => {
		onExportImageRef.current = onExportImage;
	});

	// registries is fixed at mount (see the `initialConfig` prop doc), so this
	// callback — and everything built on it — is stable for the canvas lifetime.
	const buildExportOptions = useCallback(
		(options?: CanvasExportOptions) =>
			resolveExportOptions(
				canvasStateRef.current,
				registries.objectMapper,
				options,
			),
		[registries],
	);

	// Imperative export API for hosts (same pipeline as the export dialog)
	const exportHandle = useMemo<CanvasExportHandle>(
		() => ({
			toSvgString: (options?: CanvasExportOptions) => {
				const svg = svgRef.current;
				return svg
					? withCullingSuspended(() =>
							canvasToSvgString(svg, buildExportOptions(options)),
						)
					: null;
			},
			toPngBlob: async (options?: CanvasExportOptions) => {
				const svg = svgRef.current;
				return svg
					? withCullingSuspended(() =>
							rasterizeSvgToPngBlob(svg, buildExportOptions(options)),
						)
					: null;
			},
		}),
		[svgRef, buildExportOptions, withCullingSuspended],
	);

	// Export dialog (opened from the context menu): pick format + margin, OK
	const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
	const closeExportDialog = useCallback(() => setIsExportDialogOpen(false), []);
	const openExportDialog = useCallback(() => {
		dispatch({ type: "CLOSE_CONTEXT_MENU" });
		setIsExportDialogOpen(true);
	}, [dispatch]);

	const handleExportSubmit = useCallback(
		(values: ExportSubmitValues) => {
			setIsExportDialogOpen(false);
			const svg = svgRef.current;
			if (!svg) {
				return;
			}
			withCullingSuspended(() =>
				runExportSubmit(
					svg,
					values,
					buildExportOptions(values),
					onExportImageRef.current,
					notifyError,
				),
			);
		},
		[svgRef, buildExportOptions, notifyError, withCullingSuspended],
	);

	return {
		exportHandle,
		isExportDialogOpen,
		openExportDialog,
		closeExportDialog,
		handleExportSubmit,
	};
};
