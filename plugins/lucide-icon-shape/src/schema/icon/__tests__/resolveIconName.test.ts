import { describe, expect, it } from "vitest";

import {
	isKnownIconName,
	readIconNodes,
	resolveIconName,
} from "../resolveIconName";

describe("resolveIconName", () => {
	it("returns a current name unchanged", () => {
		expect(resolveIconName("lock")).toBe("lock");
	});

	it("follows a superseded name to the current one", () => {
		expect(resolveIconName("user-circle")).toBe("circle-user");
		expect(resolveIconName("edit")).toBe("square-pen");
		// The numbered names the set used to hand out, which an older lucide taught.
		expect(resolveIconName("edit-2")).toBe("pen");
		expect(resolveIconName("loader-2")).toBe("loader-circle");
	});

	it("accepts another spelling of a current name", () => {
		expect(resolveIconName("fileText")).toBe("file-text");
		expect(resolveIconName("FileText")).toBe("file-text");
		expect(resolveIconName("file_text")).toBe("file-text");
		expect(resolveIconName("file-text-icon")).toBe("file-text");
	});

	it("accepts another spelling of a superseded name", () => {
		expect(resolveIconName("userCircle")).toBe("circle-user");
	});

	it("returns null for a name nothing answers to", () => {
		expect(resolveIconName("definitely-not-an-icon")).toBeNull();
		expect(resolveIconName("")).toBeNull();
	});
});

describe("isKnownIconName", () => {
	it("agrees with resolveIconName", () => {
		expect(isKnownIconName("user-circle")).toBe(true);
		expect(isKnownIconName("definitely-not-an-icon")).toBe(false);
	});
});

describe("readIconNodes", () => {
	it("draws a superseded name as the icon it points at", () => {
		expect(readIconNodes("user-circle")).toBe(readIconNodes("circle-user"));
	});

	it("returns nodes carrying no React key, which the renderer supplies by index", () => {
		const nodes = readIconNodes("lock") ?? [];
		expect(nodes.length).toBeGreaterThan(0);
		for (const [, attrs] of nodes) {
			expect(attrs).not.toHaveProperty("key");
		}
	});

	it("returns null for a name nothing answers to", () => {
		expect(readIconNodes("definitely-not-an-icon")).toBeNull();
	});
});
