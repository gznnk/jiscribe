import { describe, expect, it } from "vitest";

import type { SvgDoc } from "../../../../../schemas/objects/primitives/svg/SvgDoc";
import { svgToDoc, svgToState } from "../SvgMapper";
import type { SvgState } from "../SvgState";

describe("SvgMapper", () => {
	describe("svgToState", () => {
		it("rect 系の x/y/width/height を frame の cx/cy へ変換し svgText を保持する", () => {
			const doc = {
				id: "svg-1",
				type: "svg",
				x: 10,
				y: 20,
				width: 100,
				height: 50,
				rotation: 45,
				flipX: true,
				svgText: "<svg></svg>",
			} as unknown as SvgDoc;

			const state = svgToState(doc);

			expect(state.id).toBe("svg-1");
			expect(state.type).toBe("svg");
			expect(state.cx).toBe(60); // x + width / 2
			expect(state.cy).toBe(45); // y + height / 2
			expect(state.width).toBe(100);
			expect(state.height).toBe(50);
			expect(state.rotation).toBe(45);
			expect(state.scaleX).toBe(-1); // flipX = true
			expect(state.scaleY).toBe(1);
			expect(state.svgText).toBe("<svg></svg>");
		});

		it("transform 未指定時は rotation 0 / scale 1 になる", () => {
			const doc = {
				id: "svg-2",
				type: "svg",
				x: 0,
				y: 0,
				width: 80,
				height: 80,
				svgText: "<svg/>",
			} as unknown as SvgDoc;

			const state = svgToState(doc);

			expect(state.rotation).toBe(0);
			expect(state.scaleX).toBe(1);
			expect(state.scaleY).toBe(1);
		});
	});

	describe("svgToDoc", () => {
		it("frame の cx/cy を rect の x/y へ戻し svgText を保持する", () => {
			const state = {
				id: "svg-1",
				type: "svg",
				cx: 60,
				cy: 45,
				width: 100,
				height: 50,
				rotation: 0,
				scaleX: 1,
				scaleY: -1,
				svgText: "<svg></svg>",
			} as unknown as SvgState;

			const doc = svgToDoc(state);

			expect(doc.id).toBe("svg-1");
			expect(doc.type).toBe("svg");
			expect(doc.x).toBe(10); // cx - width / 2
			expect(doc.y).toBe(20); // cy - height / 2
			expect(doc.width).toBe(100);
			expect(doc.height).toBe(50);
			expect(doc.rotation).toBeUndefined();
			expect(doc.flipX).toBeUndefined();
			expect(doc.flipY).toBe(true); // scaleY < 0
			expect(doc.svgText).toBe("<svg></svg>");
		});
	});

	describe("round-trip", () => {
		it("Doc→State→Doc で位置・サイズ・svgText が保たれる", () => {
			const src = {
				id: "svg-rt",
				type: "svg",
				x: 5,
				y: 15,
				width: 120,
				height: 60,
				rotation: 30,
				svgText: "<svg viewBox='0 0 10 10'/>",
			} as unknown as SvgDoc;

			const restored = svgToDoc(svgToState(src));

			expect(restored.x).toBe(src.x);
			expect(restored.y).toBe(src.y);
			expect(restored.width).toBe(src.width);
			expect(restored.height).toBe(src.height);
			expect(restored.rotation).toBe(src.rotation);
			expect(restored.svgText).toBe(src.svgText);
		});
	});
});
