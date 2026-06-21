import { beforeAll, describe, it, expect } from "vitest";

import { initializeObjectRegistry } from "../../../../controllers/setup/initializeObjectRegistry";
import { createObjectDocFromBounds } from "../createObjectDocFromBounds";

// createObjectDocFromBounds は shapeFactoryRegistry 経由で解決されるため、レジストリを初期化する
beforeAll(() => {
	initializeObjectRegistry();
});

describe("createObjectDocFromBounds", () => {
	describe("polyline", () => {
		it("距離が minSize 未満 → null", () => {
			// (0,0)→(2,2): dist ≈ 2.83 < 5(minSize)
			expect(createObjectDocFromBounds("polyline", 0, 0, 2, 2)).toBeNull();
		});

		it("距離がちょうど minSize（= 5）→ null にならない（dist < minSize の厳密な判定）", () => {
			// (0,0)→(3,4): dist = 5 → 5 < 5 = false → null でない
			const doc = createObjectDocFromBounds("polyline", 0, 0, 3, 4);
			expect(doc).not.toBeNull();
		});

		it("距離が minSize より大きい → polyline Doc を返す", () => {
			const doc = createObjectDocFromBounds("polyline", 0, 0, 10, 0);
			expect(doc).not.toBeNull();
			expect(doc?.type).toBe("polyline");
			expect((doc as unknown as { points: unknown }).points).toEqual([
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			]);
		});

		it("overrides が適用される", () => {
			const doc = createObjectDocFromBounds("polyline", 0, 0, 10, 0, {
				stroke: "#ff0000",
			});
			expect((doc as { stroke?: string })?.stroke).toBe("#ff0000");
		});

		it("id は crypto.randomUUID() が返す UUID 形式", () => {
			const doc = createObjectDocFromBounds("polyline", 0, 0, 10, 0);
			expect(doc?.id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
			);
		});
	});

	describe("rect", () => {
		it("幅が minSize 未満 → null", () => {
			expect(createObjectDocFromBounds("rect", 0, 0, 3, 100)).toBeNull();
		});

		it("高さが minSize 未満 → null", () => {
			expect(createObjectDocFromBounds("rect", 0, 0, 100, 3)).toBeNull();
		});

		it("有効なサイズ → rect Doc を返す", () => {
			const doc = createObjectDocFromBounds("rect", 10, 20, 60, 80);
			expect(doc).not.toBeNull();
			expect(doc?.type).toBe("rect");
			const r = doc as unknown as {
				x: number;
				y: number;
				width: number;
				height: number;
			};
			expect(r.x).toBe(10);
			expect(r.y).toBe(20);
			expect(r.width).toBe(50);
			expect(r.height).toBe(60);
		});

		it("x1 > x2 でも正しく min を使って x を設定する", () => {
			const doc = createObjectDocFromBounds("rect", 60, 80, 10, 20);
			const r = doc as unknown as {
				x: number;
				y: number;
				width: number;
				height: number;
			};
			expect(r.x).toBe(10);
			expect(r.y).toBe(20);
			expect(r.width).toBe(50);
			expect(r.height).toBe(60);
		});

		it("overrides は RECT_DOC_DEFAULTS を上書きする", () => {
			const doc = createObjectDocFromBounds("rect", 0, 0, 100, 100, {
				fill: "blue",
			});
			expect((doc as { fill?: string })?.fill).toBe("blue");
		});

		it("カスタム minSize を指定できる", () => {
			// minSize=20 → width=15 < 20 → null
			expect(
				createObjectDocFromBounds("rect", 0, 0, 15, 100, {}, 20),
			).toBeNull();
		});
	});

	describe("ellipse", () => {
		it("有効なサイズ → ellipse Doc を返す", () => {
			const doc = createObjectDocFromBounds("ellipse", 0, 0, 40, 20);
			expect(doc).not.toBeNull();
			expect(doc?.type).toBe("ellipse");
			const e = doc as unknown as {
				cx: number;
				cy: number;
				rx: number;
				ry: number;
			};
			expect(e.cx).toBe(20);
			expect(e.cy).toBe(10);
			expect(e.rx).toBe(20);
			expect(e.ry).toBe(10);
		});
	});
});
