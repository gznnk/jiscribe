import { describe, it, expect, vi } from "vitest";

import { getSvgPoint } from "../getSvgPoint";

describe("getSvgPoint", () => {
	describe("svg is null", () => {
		it("returns the client coordinates as-is", () => {
			expect(getSvgPoint(null, 30, 50)).toEqual({ x: 30, y: 50 });
		});
	});

	describe("svg exists", () => {
		it("falls back to client coordinates when getScreenCTM is null", () => {
			const mockSvg = {
				createSVGPoint: () => ({ x: 0, y: 0 }),
				getScreenCTM: () => null,
			} as unknown as SVGSVGElement;
			expect(getSvgPoint(mockSvg, 10, 20)).toEqual({ x: 10, y: 20 });
		});

		it("the return value of matrixTransform becomes the result directly", () => {
			const transformedPoint = { x: 42, y: 99 };
			const ctmMock = { inverse: vi.fn().mockReturnValue({}) };
			const svgWithTransform = {
				createSVGPoint: () => ({
					x: 0,
					y: 0,
					matrixTransform: vi.fn().mockReturnValue(transformedPoint),
				}),
				getScreenCTM: vi.fn().mockReturnValue(ctmMock),
			} as unknown as SVGSVGElement;

			const result = getSvgPoint(svgWithTransform, 10, 20);
			expect(result).toEqual({ x: 42, y: 99 });
		});
	});
});
