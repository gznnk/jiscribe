import { describe, expect, it } from "vitest";

import type { ExportSubmitValues } from "../../ui/modal/ExportDialog";
import { toExportOptions } from "../useExportDialog";

const createValues = (
	scope: ExportSubmitValues["scope"],
): ExportSubmitValues => ({
	scope,
	format: "svg",
	margin: 24,
	includeSource: false,
	transparentBackground: true,
});

describe("toExportOptions", () => {
	it("exports the whole drawing for the all scope, whatever is selected", () => {
		expect(toExportOptions(createValues("all"), ["rect-1"])).toEqual({
			region: "content",
			margin: 24,
			includeSource: false,
			transparentBackground: true,
		});
	});

	it("isolates the selected ids for the selection scope, keeping the margin", () => {
		const selectedIds = ["rect-1", "ellipse-2"];
		expect(toExportOptions(createValues("selection"), selectedIds)).toEqual({
			region: { ids: selectedIds, isolate: true },
			margin: 24,
			includeSource: false,
			transparentBackground: true,
		});
	});

	it("falls back to the whole drawing when the selection is empty at submit time", () => {
		expect(toExportOptions(createValues("selection"), []).region).toBe(
			"content",
		);
	});
});
