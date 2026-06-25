import { describe, it, expect } from "vitest";

import { segmentDirection } from "../segmentDirection";

describe("segmentDirection", () => {
	it("厳密に軸並行なセグメントのみ方向を返す", () => {
		expect(segmentDirection({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe("right");
		expect(segmentDirection({ x: 0, y: 0 }, { x: -10, y: 0 })).toBe("left");
		expect(segmentDirection({ x: 0, y: 0 }, { x: 0, y: 10 })).toBe("down");
		expect(segmentDirection({ x: 0, y: 0 }, { x: 0, y: -10 })).toBe("up");
	});

	it("斜め・長さ0は null", () => {
		expect(segmentDirection({ x: 0, y: 0 }, { x: 10, y: 10 })).toBeNull();
		expect(segmentDirection({ x: 5, y: 5 }, { x: 5, y: 5 })).toBeNull();
	});
});
