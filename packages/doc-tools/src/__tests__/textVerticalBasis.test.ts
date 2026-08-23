import type { CanvasDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { diagnoseDoc } from "../diagnoseDoc";
import { resolveContentBox } from "../resolveContentBox";
import { validateDoc } from "../validateDoc";

/** A one-object document, as it would be read off disk. */
const docOf = (object: Record<string, unknown>): CanvasDoc => {
	const result = validateDoc(JSON.stringify({ version: 1, root: [object] }));
	if (result.doc === undefined) {
		throw new Error(
			result.diagnostics.map((diagnostic) => diagnostic.message).join("; "),
		);
	}
	return result.doc;
};

/** Findings about the shape's own body, the connector checks having nothing to say here. */
const diagnose = (object: Record<string, unknown>) =>
	diagnoseDoc(docOf(object));

/**
 * Three lines at 16px, which come to 72px of line boxes — more than the 64px a
 * 100px-tall cylinder keeps clear of its caps, and less than the 100px the frame
 * basis gives it.
 */
const THREE_LINES = "one\ntwo\nthree";

describe("resolveContentBox with a vertical basis", () => {
	it("keeps a cylinder's text off its caps when no basis is named", () => {
		const resolution = resolveContentBox({
			type: "db",
			width: 200,
			height: 100,
		});
		expect(resolution).toMatchObject({
			kind: "region",
			// 24% off the top for the cap, 12% off the bottom for the bulge,
			// then the shared 2px of padding.
			rect: { y: -50 + 24 + 2, height: 100 - 36 - 4 },
			declaredRegion: { y: -50 + 24, height: 100 - 36 },
		});
	});

	it("spans the whole height for the frame basis, the declared region reported beside it", () => {
		const resolution = resolveContentBox({
			type: "db",
			width: 200,
			height: 100,
			textVerticalBasis: "frame",
		});
		expect(resolution).toMatchObject({
			kind: "region",
			rect: { y: -50 + 2, height: 100 - 4 },
			declaredRegion: { y: -50 + 24, height: 100 - 36 },
		});
	});

	it("leaves the width to the region, so a stadium's caps still push the text in", () => {
		const framed = resolveContentBox({
			type: "stadium",
			width: 240,
			height: 80,
			textVerticalBasis: "frame",
		});
		const declared = resolveContentBox({
			type: "stadium",
			width: 240,
			height: 80,
		});
		expect(framed.kind).toBe("region");
		expect(declared.kind).toBe("region");
		if (framed.kind !== "region" || declared.kind !== "region") {
			return;
		}
		expect(framed.rect.x).toBe(declared.rect.x);
		expect(framed.rect.width).toBe(declared.rect.width);
	});

	it("reads an unknown basis as the default rather than failing", () => {
		expect(
			resolveContentBox({
				type: "db",
				width: 200,
				height: 100,
				textVerticalBasis: "outline",
			}),
		).toEqual(resolveContentBox({ type: "db", width: 200, height: 100 }));
	});

	it("changes nothing for a type whose region is its whole box", () => {
		expect(
			resolveContentBox({
				type: "rect",
				width: 200,
				height: 100,
				textVerticalBasis: "frame",
			}),
		).toEqual(resolveContentBox({ type: "rect", width: 200, height: 100 }));
	});
});

describe("overflow measured against the basis", () => {
	it("calls a body that the caps would clip an error while it is placed on the region", () => {
		const diagnostics = diagnose({
			id: "store",
			type: "db",
			x: 0,
			y: 0,
			width: 200,
			height: 100,
			text: THREE_LINES,
			fontSize: 16,
		});
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({
			severity: "error",
			objectId: "store",
		});
		expect(diagnostics[0].message).toMatch(/text overflows db/);
	});

	it("clears the same body once it is placed on the whole shape", () => {
		const diagnostics = diagnose({
			id: "store",
			type: "db",
			x: 0,
			y: 0,
			width: 200,
			height: 100,
			text: THREE_LINES,
			fontSize: 16,
			textVerticalBasis: "frame",
		});
		expect(
			diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
		).toEqual([]);
	});
});

describe("decoration overlap", () => {
	it("warns when a frame-placed body reaches past the region its type keeps clear", () => {
		const diagnostics = diagnose({
			id: "store",
			type: "db",
			x: 0,
			y: 0,
			width: 200,
			height: 100,
			text: THREE_LINES,
			fontSize: 16,
			textVerticalBasis: "frame",
		});
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({
			severity: "warning",
			objectId: "store",
		});
		expect(diagnostics[0].message).toMatch(
			/text in db is placed on the whole shape \(textVerticalBasis "frame"\)/,
		);
		expect(diagnostics[0].message).toMatch(/past the region db keeps clear/);
	});

	it("leaves the document valid, the finding being one of appearance", () => {
		const source = JSON.stringify({
			version: 1,
			root: [
				{
					id: "store",
					type: "db",
					x: 0,
					y: 0,
					width: 200,
					height: 100,
					text: THREE_LINES,
					fontSize: 16,
					textVerticalBasis: "frame",
				},
			],
		});
		expect(validateDoc(source).ok).toBe(true);
	});

	it("reports nothing for a body that still sits inside the declared region", () => {
		expect(
			diagnose({
				id: "store",
				type: "db",
				x: 0,
				y: 0,
				width: 200,
				height: 100,
				text: "one",
				fontSize: 16,
				textVerticalBasis: "frame",
			}),
		).toEqual([]);
	});

	it("reports nothing for a symmetric type, whose two bases place the body alike", () => {
		expect(
			diagnose({
				id: "box",
				type: "rect",
				x: 0,
				y: 0,
				width: 200,
				height: 100,
				text: THREE_LINES,
				fontSize: 16,
				textVerticalBasis: "frame",
			}),
		).toEqual([]);
	});

	it("reports nothing for the same overhang while the body is placed on the region", () => {
		expect(
			diagnose({
				id: "store",
				type: "db",
				x: 0,
				y: 0,
				width: 200,
				height: 100,
				text: "one",
				fontSize: 16,
			}),
		).toEqual([]);
	});

	it("finds the overhang at the bottom too, for a body aligned there", () => {
		const diagnostics = diagnose({
			id: "store",
			type: "db",
			x: 0,
			y: 0,
			width: 200,
			height: 100,
			text: "one",
			fontSize: 16,
			verticalAlign: "bottom",
			textVerticalBasis: "frame",
		});
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].severity).toBe("warning");
	});
});
