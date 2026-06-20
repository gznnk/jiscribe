import { describe, it, expect } from "vitest";

import { getResizeCursorForRotation } from "../getResizeCursorForRotation";

describe("getResizeCursorForRotation", () => {
	describe("回転なし・スケール標準（offset=0 = 右ハンドル）", () => {
		it("rotation=0 → e-resize", () => {
			expect(getResizeCursorForRotation(0, 0)).toBe("e-resize");
		});

		it("rotation=45 → se-resize", () => {
			expect(getResizeCursorForRotation(0, 45)).toBe("se-resize");
		});

		it("rotation=90 → s-resize", () => {
			expect(getResizeCursorForRotation(0, 90)).toBe("s-resize");
		});

		it("rotation=135 → sw-resize", () => {
			expect(getResizeCursorForRotation(0, 135)).toBe("sw-resize");
		});

		it("rotation=180 → w-resize", () => {
			expect(getResizeCursorForRotation(0, 180)).toBe("w-resize");
		});

		it("rotation=225 → nw-resize", () => {
			expect(getResizeCursorForRotation(0, 225)).toBe("nw-resize");
		});

		it("rotation=270 → n-resize", () => {
			expect(getResizeCursorForRotation(0, 270)).toBe("n-resize");
		});

		it("rotation=315 → ne-resize", () => {
			expect(getResizeCursorForRotation(0, 315)).toBe("ne-resize");
		});
	});

	describe("offset による初期方向指定", () => {
		it("offset=90（下ハンドル）rotation=0 → s-resize", () => {
			expect(getResizeCursorForRotation(90, 0)).toBe("s-resize");
		});

		it("offset=45（右下コーナー）rotation=0 → se-resize", () => {
			expect(getResizeCursorForRotation(45, 0)).toBe("se-resize");
		});

		it("offset=90（下ハンドル）rotation=90 → w-resize（90+90=180→w）", () => {
			expect(getResizeCursorForRotation(90, 90)).toBe("w-resize");
		});
	});

	describe("scaleX が負（水平反転）", () => {
		it("offset=0 scaleX=-1 → ローカル角度が 180 に鏡映 → w-resize", () => {
			expect(getResizeCursorForRotation(0, 0, -1, 1)).toBe("w-resize");
		});

		it("offset=45 scaleX=-1 → 180-45=135 → sw-resize", () => {
			expect(getResizeCursorForRotation(45, 0, -1, 1)).toBe("sw-resize");
		});
	});

	describe("scaleY が負（垂直反転）", () => {
		it("offset=90 scaleY=-1 → ローカル角度が -90 = 270 → n-resize", () => {
			expect(getResizeCursorForRotation(90, 0, 1, -1)).toBe("n-resize");
		});
	});

	describe("scaleX と scaleY が両方負", () => {
		it("offset=0 両方反転 → 180-0=180 → scaleY=-1で-180=-180+360=180 → w-resize", () => {
			// localAngle: scaleX<0 → 180-0=180; scaleY<0 → -180; norm=180 → w-resize
			expect(getResizeCursorForRotation(0, 0, -1, -1)).toBe("w-resize");
		});
	});

	describe("境界値（22.5 度付近）", () => {
		it("rotation=22 → e-resize（22.5未満）", () => {
			expect(getResizeCursorForRotation(0, 22)).toBe("e-resize");
		});

		it("rotation=23 → se-resize（22.5以上）", () => {
			expect(getResizeCursorForRotation(0, 23)).toBe("se-resize");
		});

		it("rotation=337 → ne-resize（337.5未満）", () => {
			expect(getResizeCursorForRotation(0, 337)).toBe("ne-resize");
		});

		it("rotation=338 → e-resize（337.5以上）", () => {
			expect(getResizeCursorForRotation(0, 338)).toBe("e-resize");
		});
	});

	describe("負の rotation", () => {
		it("rotation=-45 → ne-resize（315度相当）", () => {
			expect(getResizeCursorForRotation(0, -45)).toBe("ne-resize");
		});
	});
});
