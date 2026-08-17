import { describe, expect, it } from "vitest";

import { isAiDocOp } from "../canvasOps";
import { createCanvasToolDescriptors } from "../canvasTools";
import type { AiCanvasCapabilities } from "../capabilities";

const capabilities: AiCanvasCapabilities = {
	creatableObjectTypes: ["rect", "ellipse", "diamond"],
	connectableObjectTypes: ["rect", "ellipse"],
};

describe("isAiDocOp", () => {
	it("keeps the operations a document alone can serve", () => {
		expect(isAiDocOp({ kind: "describeCanvas" })).toBe(true);
		expect(isAiDocOp({ kind: "deleteObjects", ids: ["rect-1"] })).toBe(true);
		expect(isAiDocOp({ kind: "undo" })).toBe(true);
	});

	it("rejects everything that needs a mounted canvas, measurements included", () => {
		expect(isAiDocOp({ kind: "captureCanvas" })).toBe(false);
		expect(isAiDocOp({ kind: "fitView", target: "all" })).toBe(false);
		expect(isAiDocOp({ kind: "measureText", id: "rect-1" })).toBe(false);
		expect(isAiDocOp({ kind: "findOverlaps" })).toBe(false);
		expect(isAiDocOp({ kind: "measureConnectorPath", id: "c-1" })).toBe(false);
		expect(isAiDocOp({ kind: "measureVisualBounds", ids: ["rect-1"] })).toBe(
			false,
		);
	});

	it("routes every tool's operation one way or the other", () => {
		// A kind missing from the handle-op map would be routed to a host with no
		// canvas, where it can only fail; this is what catches the omission
		const handleOpNames = createCanvasToolDescriptors(capabilities)
			.filter((descriptor) => !isAiDocOp(descriptor.toOp({})))
			.map((descriptor) => descriptor.name);

		expect(handleOpNames).toEqual([
			"capture_canvas",
			"measure_text",
			"find_overlaps",
			"measure_connector_path",
			"measure_visual_bounds",
			"select_objects",
			"center_view",
			"fit_view",
		]);
	});
});
