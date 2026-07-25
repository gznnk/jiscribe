import { describe, it, expect } from "vitest";

import { classifyChildRelativeRotation } from "../classifyChildRelativeRotation";

describe("classifyChildRelativeRotation", () => {
	it("classifies 0 and 180 degrees of relative rotation as parallel", () => {
		expect(classifyChildRelativeRotation(0, 0)).toBe("parallel");
		expect(classifyChildRelativeRotation(180, 0)).toBe("parallel");
		expect(classifyChildRelativeRotation(30, 30)).toBe("parallel");
		expect(classifyChildRelativeRotation(210, 30)).toBe("parallel");
	});

	it("classifies 90 and 270 degrees of relative rotation as orthogonal", () => {
		expect(classifyChildRelativeRotation(90, 0)).toBe("orthogonal");
		expect(classifyChildRelativeRotation(270, 0)).toBe("orthogonal");
		expect(classifyChildRelativeRotation(120, 30)).toBe("orthogonal");
		expect(classifyChildRelativeRotation(300, 30)).toBe("orthogonal");
	});

	it("classifies anything else as oblique", () => {
		expect(classifyChildRelativeRotation(45, 0)).toBe("oblique");
		expect(classifyChildRelativeRotation(1, 0)).toBe("oblique");
		expect(classifyChildRelativeRotation(89, 0)).toBe("oblique");
		expect(classifyChildRelativeRotation(179, 0)).toBe("oblique");
	});

	it("depends only on the difference, not on the absolute angles", () => {
		for (const groupRotation of [0, 37, 180, 359]) {
			expect(
				classifyChildRelativeRotation(groupRotation + 90, groupRotation),
			).toBe("orthogonal");
		}
	});

	it("normalizes a negative difference into the same class", () => {
		expect(classifyChildRelativeRotation(0, 90)).toBe("orthogonal");
		expect(classifyChildRelativeRotation(0, 180)).toBe("parallel");
		expect(classifyChildRelativeRotation(-90, 0)).toBe("orthogonal");
	});

	it("treats a 360-degree difference as parallel, not oblique", () => {
		expect(classifyChildRelativeRotation(360, 0)).toBe("parallel");
		expect(classifyChildRelativeRotation(0, 360)).toBe("parallel");
	});

	it("absorbs float noise within the 0.001-degree tolerance", () => {
		expect(classifyChildRelativeRotation(0.0005, 0)).toBe("parallel");
		expect(classifyChildRelativeRotation(90.0005, 0)).toBe("orthogonal");
		expect(classifyChildRelativeRotation(89.99, 0)).toBe("oblique");
	});
});
