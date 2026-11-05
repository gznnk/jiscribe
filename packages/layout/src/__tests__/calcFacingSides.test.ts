import { describe, expect, it } from "vitest";

import { calcFacingSides } from "../calcFacingSides";

const at = (x: number, y: number) => ({ x, y, width: 20, height: 20 });

describe("calcFacingSides", () => {
	it("faces along the axis the centres lie further apart on", () => {
		expect(calcFacingSides(at(0, 0), at(100, 30))).toEqual({
			source: { side: "right", t: 0.5 },
			target: { side: "left", t: 0.5 },
		});
		expect(calcFacingSides(at(0, 0), at(-100, 30))).toEqual({
			source: { side: "left", t: 0.5 },
			target: { side: "right", t: 0.5 },
		});
		expect(calcFacingSides(at(0, 0), at(30, 100))).toEqual({
			source: { side: "bottom", t: 0.5 },
			target: { side: "top", t: 0.5 },
		});
		expect(calcFacingSides(at(0, 0), at(30, -100))).toEqual({
			source: { side: "top", t: 0.5 },
			target: { side: "bottom", t: 0.5 },
		});
	});

	it("takes the horizontal axis on a tie, right to left for the same centre", () => {
		expect(calcFacingSides(at(0, 0), at(50, 50)).source.side).toBe("right");
		expect(calcFacingSides(at(0, 0), at(0, 0)).source.side).toBe("right");
	});
});
