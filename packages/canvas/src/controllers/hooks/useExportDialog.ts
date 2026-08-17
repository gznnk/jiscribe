import {
	type Dispatch,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
} from "react";

import type { NotifyError } from "./useErrorNotification";
import {
	canvasToSvgString,
	exportCanvasToPng,
	exportCanvasToSvg,
	rasterizeSvgToPng,
} from "../../export";
import type { BuildExportSvgOptions } from "../../export";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasAction } from "../reducer/CanvasActions";
import type { CanvasRegistries } from "../registries";
import type {
	ExportImageFormat,
	ExportSubmitValues,
} from "../ui/modal/ExportDialog";
import { resolveExportOptions } from "../utils/resolveExportOptions";

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
				rasterizeSvgToPng(svg, exportOptions).then(
					({ blob }) => deliver(blob),
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

type UseExportDialogParams = {
	/** The live canvas `<svg>` (null until CanvasView mounts) */
	svgRef: RefObject<SVGSVGElement | null>;
	canvasState: CanvasControllerState;
	registries: CanvasRegistries;
	onExportImage: ((payload: CanvasExportImagePayload) => void) | undefined;
	dispatch: Dispatch<CanvasAction>;
	notifyError: NotifyError;
	/**
	 * Runs the snapshot with viewport culling suspended (full object tree in
	 * the DOM), since every export path clones the live SVG. The synchronous
	 * part of the snapshot must complete the clone — for the PNG path this
	 * holds because rasterizeSvgToPng serializes before its first await.
	 */
	withCullingSuspended: <T>(snapshot: () => T) => T;
};

/**
 * Owns the export dialog's submit — the dialog's own open state lives in the
 * reducer as `activeModal`, and the imperative counterpart is the `export`
 * handle (see handles/useExportHandle). Both build their options through the
 * one `resolveExportOptions`, so the dialog and a host produce the same image.
 *
 * Export options are built from the state at export time (not at render time),
 * so the returned callback stays referentially stable across state updates and
 * unstable host callbacks.
 *
 * @param params - See {@link UseExportDialogParams}
 * @returns The dialog's submit handler, to hand to ExportDialog
 */
export const useExportDialog = ({
	svgRef,
	canvasState,
	registries,
	onExportImage,
	dispatch,
	notifyError,
	withCullingSuspended,
}: UseExportDialogParams): ((values: ExportSubmitValues) => void) => {
	// Always-fresh mirror of the state, read at export time rather than at render
	// time, so the callback below never has to be rebuilt.
	const canvasStateRef = useRef(canvasState);
	useEffect(() => {
		canvasStateRef.current = canvasState;
	});

	// onExportImage goes through a ref so a host passing a new function each
	// render cannot re-create the submit handler.
	const onExportImageRef = useRef(onExportImage);
	useEffect(() => {
		onExportImageRef.current = onExportImage;
	});

	// Export dialog (opened by ExportCommand): pick format + margin, OK
	return useCallback(
		(values: ExportSubmitValues) => {
			dispatch({ type: "CLOSE_MODAL" });
			const svg = svgRef.current;
			if (!svg) {
				return;
			}
			withCullingSuspended(() =>
				runExportSubmit(
					svg,
					values,
					resolveExportOptions(
						canvasStateRef.current,
						registries.objectMapper,
						registries.objectVisualBounds,
						values,
					),
					onExportImageRef.current,
					notifyError,
				),
			);
		},
		[svgRef, registries, dispatch, notifyError, withCullingSuspended],
	);
};
