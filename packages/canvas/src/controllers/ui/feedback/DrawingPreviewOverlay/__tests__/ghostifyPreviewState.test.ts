import { describe, it, expect } from "vitest";

import { theme } from "../../../../../constants/theme";
import { resolveAutoColor } from "../../../../../presentations/objects/utils/resolveAutoColor";
import { AUTO_COLOR } from "../../../../../schemas/objects/utils/autoColor";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import { ghostifyPreviewState } from "../ghostifyPreviewState";

const state = (extra: Record<string, unknown> = {}): ObjectState =>
	({
		id: "rect-1",
		type: "rect",
		cx: 10,
		cy: 20,
		width: 100,
		height: 50,
		...extra,
	}) as unknown as ObjectState;

const asRecord = (value: ObjectState): Record<string, unknown> =>
	value as unknown as Record<string, unknown>;

describe("ghostifyPreviewState", () => {
	it("keeps identity and geometry so the shape's own component can render it", () => {
		const ghost = asRecord(ghostifyPreviewState(state()));
		expect(ghost).toMatchObject({
			id: "rect-1",
			type: "rect",
			cx: 10,
			cy: 20,
			width: 100,
			height: 50,
		});
	});

	it("passes a concrete stroke through unchanged", () => {
		const ghost = asRecord(ghostifyPreviewState(state({ stroke: "#ff0000" })));
		expect(ghost.stroke).toBe("#ff0000");
	});

	it("resolves an auto stroke to the theme ink so the ghost matches the placed shape", () => {
		const ghost = asRecord(ghostifyPreviewState(state({ stroke: AUTO_COLOR })));
		expect(ghost.stroke).toBe(resolveAutoColor(AUTO_COLOR, "ink"));
		expect(ghost.stroke).toBe(theme.objectInk);
	});

	it("treats an absent stroke as auto", () => {
		expect(asRecord(ghostifyPreviewState(state())).stroke).toBe(
			resolveAutoColor(AUTO_COLOR, "ink"),
		);
	});

	it("tints the fill from the resolved stroke, discarding the original fill", () => {
		const ghost = asRecord(
			ghostifyPreviewState(state({ stroke: "#ff0000", fill: "#00ff00" })),
		);
		expect(ghost.fill).toBe("color-mix(in srgb, #ff0000 18%, transparent)");
	});

	it("forces the uniform preview outline regardless of the shape's own stroke", () => {
		const ghost = asRecord(
			ghostifyPreviewState(
				state({ strokeWidth: 12, strokeDashType: "dotted" }),
			),
		);
		expect(ghost.strokeWidth).toBe(1.5);
		expect(ghost.strokeDashType).toBe("solid");
	});

	it("blanks every text slot so no overlay is shown over the ghost", () => {
		expect(
			asRecord(
				ghostifyPreviewState(state({ text: { body: { text: "hello" } } })),
			).text,
		).toEqual({ body: { text: "" } });
	});

	it("keeps the slot keys, their content kinds, and their styling while blanking", () => {
		expect(
			asRecord(
				ghostifyPreviewState(
					state({
						text: {
							name: { text: "User", fontWeight: "bold" },
							rows: { text: ["id"] },
						},
					}),
				),
			).text,
		).toEqual({ name: { text: "", fontWeight: "bold" }, rows: { text: [] } });
	});

	it("adds no text field to a shape that holds none", () => {
		expect("text" in asRecord(ghostifyPreviewState(state()))).toBe(false);
	});

	it("does not mutate the source state", () => {
		const source = state({
			stroke: "#ff0000",
			text: { body: { text: "hello" } },
			strokeWidth: 12,
		});
		ghostifyPreviewState(source);
		expect(asRecord(source)).toMatchObject({
			stroke: "#ff0000",
			text: { body: { text: "hello" } },
			strokeWidth: 12,
		});
	});
});
