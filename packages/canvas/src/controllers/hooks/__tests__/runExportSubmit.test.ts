import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	canvasToSvgString,
	exportCanvasToPng,
	exportCanvasToSvg,
	rasterizeSvgToPngBlob,
} from "../../../export";
import type { BuildExportSvgOptions } from "../../../export";
import type { ExportSubmitValues } from "../../ui/modal/ExportDialog";
import { runExportSubmit } from "../useCanvasExport";

vi.mock("../../../export", () => ({
	canvasToSvgString: vi.fn(),
	exportCanvasToPng: vi.fn(),
	exportCanvasToSvg: vi.fn(),
	rasterizeSvgToPngBlob: vi.fn(),
}));

/**
 * runExportSubmit（エクスポートダイアログ確定時の分岐実行関数）の
 * 配信先の選択と、全分岐の失敗が notifyError に到達することを検証する。
 * SVG 生成・ラスタライズ自体は export/ 側の責務なのでここでは扱わない。
 */

const svg = {} as unknown as SVGSVGElement;
const exportOptions = {} as BuildExportSvgOptions;

const createValues = (
	format: ExportSubmitValues["format"],
): ExportSubmitValues => ({
	format,
	margin: 16,
	includeSource: true,
	transparentBackground: false,
});

const flushAsync = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("runExportSubmit", () => {
	const notifyError = vi.fn();
	const deliverToHost = vi.fn();

	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	describe("host mode (deliverToHost set)", () => {
		it("delivers the SVG payload to the host", () => {
			vi.mocked(canvasToSvgString).mockReturnValue("<svg />");

			runExportSubmit(
				svg,
				createValues("svg"),
				exportOptions,
				deliverToHost,
				notifyError,
			);

			expect(deliverToHost).toHaveBeenCalledWith({
				format: "svg",
				data: expect.any(Blob),
				includesSource: true,
			});
			expect(notifyError).not.toHaveBeenCalled();
		});

		it("delivers the PNG payload to the host", async () => {
			const pngBlob = new Blob(["png"]);
			vi.mocked(rasterizeSvgToPngBlob).mockResolvedValue(pngBlob);

			runExportSubmit(
				svg,
				createValues("png"),
				exportOptions,
				deliverToHost,
				notifyError,
			);
			await flushAsync();

			expect(deliverToHost).toHaveBeenCalledWith({
				format: "png",
				data: pngBlob,
				includesSource: true,
			});
			expect(notifyError).not.toHaveBeenCalled();
		});

		it("notifies exportImageError when SVG serialization throws", () => {
			vi.mocked(canvasToSvgString).mockImplementation(() => {
				throw new Error("serialize failed");
			});

			runExportSubmit(
				svg,
				createValues("svg"),
				exportOptions,
				deliverToHost,
				notifyError,
			);

			expect(notifyError).toHaveBeenCalledTimes(1);
			expect(notifyError).toHaveBeenCalledWith("exportImageError");
			expect(deliverToHost).not.toHaveBeenCalled();
		});

		it("notifies exportImageError when PNG rasterization rejects", async () => {
			vi.mocked(rasterizeSvgToPngBlob).mockRejectedValue(
				new Error("rasterize failed"),
			);

			runExportSubmit(
				svg,
				createValues("png"),
				exportOptions,
				deliverToHost,
				notifyError,
			);
			await flushAsync();

			expect(notifyError).toHaveBeenCalledTimes(1);
			expect(notifyError).toHaveBeenCalledWith("exportImageError");
			expect(deliverToHost).not.toHaveBeenCalled();
		});
	});

	describe("download mode (no deliverToHost)", () => {
		it("downloads via exportCanvasToSvg / exportCanvasToPng", async () => {
			vi.mocked(exportCanvasToPng).mockResolvedValue(undefined);

			runExportSubmit(
				svg,
				createValues("svg"),
				exportOptions,
				undefined,
				notifyError,
			);
			runExportSubmit(
				svg,
				createValues("png"),
				exportOptions,
				undefined,
				notifyError,
			);
			await flushAsync();

			expect(exportCanvasToSvg).toHaveBeenCalledWith(svg, exportOptions);
			expect(exportCanvasToPng).toHaveBeenCalledWith(svg, exportOptions);
			expect(notifyError).not.toHaveBeenCalled();
		});

		it("notifies exportImageError when the SVG download throws", () => {
			vi.mocked(exportCanvasToSvg).mockImplementation(() => {
				throw new Error("download failed");
			});

			runExportSubmit(
				svg,
				createValues("svg"),
				exportOptions,
				undefined,
				notifyError,
			);

			expect(notifyError).toHaveBeenCalledTimes(1);
			expect(notifyError).toHaveBeenCalledWith("exportImageError");
		});

		it("notifies exportImageError when the PNG download rejects", async () => {
			vi.mocked(exportCanvasToPng).mockRejectedValue(
				new Error("download failed"),
			);

			runExportSubmit(
				svg,
				createValues("png"),
				exportOptions,
				undefined,
				notifyError,
			);
			await flushAsync();

			expect(notifyError).toHaveBeenCalledTimes(1);
			expect(notifyError).toHaveBeenCalledWith("exportImageError");
		});
	});
});
