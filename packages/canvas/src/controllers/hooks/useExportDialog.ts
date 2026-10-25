import { type Dispatch, type RefObject, useCallback } from "react";

import type { NotifyError } from "./useErrorNotification";
import { useLatestRef } from "../../foundation/hooks/useLatestRef";
import {
	canvasToSvgString,
	exportCanvasToPng,
	exportCanvasToSvg,
	rasterizeSvgToPng,
} from "../../rendering/export";
import type {
	BuildExportSvgOptions,
	ResolveImageBlob,
} from "../../rendering/export";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasAction } from "../reducer/CanvasActions";
import type { CanvasRegistries } from "../registries";
import type {
	ExportImageFormat,
	ExportSubmitValues,
} from "../ui/modal/ExportDialog";
import { resolveExportOptions } from "../utils/resolveExportOptions";
import type {
	CanvasExportOptions,
	ResolvedCanvasExport,
} from "../utils/resolveExportOptions";
import type { SnapshotRenderScope } from "../utils/SnapshotRenderScope";

/**
 * Exported image handed to the `onExportImage` prop: the encoded bytes plus
 * what the host needs to derive a file name.
 */
export type CanvasExportImagePayload = {
	format: ExportImageFormat;
	/** Encoded image bytes (PNG, or serialized SVG text) */
	data: Blob;
	/** Whether the `.jis` source is embedded (re-editable image) */
	includesSource: boolean;
};

/**
 * Maps what the export dialog confirmed onto the options `resolveExportOptions`
 * takes. The `"selection"` scope becomes an isolated `{ ids }` region, so the
 * image draws the selection alone (see CanvasExportIdsRegion.isolate), framed
 * by its extent with the margin around it.
 *
 * @param values - What the dialog submitted; its `format` plays no part here
 * @param selectedIds - The selection at submit time. When empty, a
 *   `"selection"` scope falls back to the whole drawing (`"content"`), since an
 *   `{ ids }` region with nothing to draw is refused
 * @returns The region, margin, source embedding and background to export with
 */
export const toExportOptions = (
	values: ExportSubmitValues,
	selectedIds: readonly string[],
): CanvasExportOptions => ({
	region:
		values.scope === "selection" && selectedIds.length > 0
			? { ids: selectedIds, isolate: true }
			: "content",
	margin: values.margin,
	includeSource: values.includeSource,
	transparentBackground: values.transparentBackground,
});

/** Logs a failed export and shows the user the export error toast. */
const reportExportFailure = (err: unknown, notifyError: NotifyError): void => {
	console.error("[Canvas] Image export failed:", err);
	notifyError("exportImageError");
};

/**
 * Runs the chosen export (with source: SVG embeds the .jis in
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
		reportExportFailure(err, notifyError);
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
				canvasToSvgString(svg, exportOptions).then(
					(svgText) =>
						deliver(
							new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }),
						),
					reportExportError,
				);
			} else {
				rasterizeSvgToPng(svg, exportOptions).then(
					({ blob }) => deliver(blob),
					reportExportError,
				);
			}
			return;
		}
		if (values.format === "svg") {
			exportCanvasToSvg(svg, exportOptions).catch(reportExportError);
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
	 * Runs the snapshot with the viewport culling gate replaced by the export's
	 * render scope (the full object tree, or the isolated selection), since every
	 * export path clones the live SVG. The synchronous part of the snapshot must
	 * complete the clone — both paths hold because they build the export SVG
	 * (clone, style baking, text conversion) before their first await, which is
	 * the one reading the image bytes.
	 */
	withSnapshotRenderScope: <T>(
		renderScope: SnapshotRenderScope,
		snapshot: () => T,
	) => T;
	/** Reads the bytes an exported `<image>` carries (see buildExportSvg) */
	resolveImageBlob: ResolveImageBlob;
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
	withSnapshotRenderScope,
	resolveImageBlob,
}: UseExportDialogParams): ((values: ExportSubmitValues) => void) => {
	// Always-fresh mirror of the state, read at export time rather than at render
	// time, so the callback below never has to be rebuilt.
	const canvasStateRef = useLatestRef(canvasState);

	// onExportImage goes through a ref so a host passing a new function each
	// render cannot re-create the submit handler.
	const onExportImageRef = useLatestRef(onExportImage);

	// Mirrored like the state: it changes identity as files arrive, and the submit
	// handler is meant to survive that.
	const resolveImageBlobRef = useLatestRef(resolveImageBlob);

	// Export dialog (opened by ExportCommand): pick format + margin, OK
	return useCallback(
		(values: ExportSubmitValues) => {
			dispatch({ type: "CLOSE_MODAL" });
			const svg = svgRef.current;
			if (!svg) {
				return;
			}
			let resolved: ResolvedCanvasExport;
			try {
				resolved = resolveExportOptions(
					canvasStateRef.current,
					registries.objectMapper,
					registries,
					toExportOptions(values, canvasStateRef.current.selection.objectIds),
				);
			} catch (err) {
				reportExportFailure(err, notifyError);
				return;
			}
			const { svgOptions, renderScope } = resolved;
			withSnapshotRenderScope(renderScope, () =>
				runExportSubmit(
					svg,
					values,
					{
						...svgOptions,
						resolveImageBlob: (src: string) => resolveImageBlobRef.current(src),
					},
					onExportImageRef.current,
					notifyError,
				),
			);
		},
		[
			svgRef,
			canvasStateRef,
			onExportImageRef,
			resolveImageBlobRef,
			registries,
			dispatch,
			notifyError,
			withSnapshotRenderScope,
		],
	);
};
