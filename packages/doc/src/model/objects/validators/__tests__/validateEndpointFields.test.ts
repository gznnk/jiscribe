import { describe, it, expect } from "vitest";

import { validateEndpointRef } from "../validateEndpointFields";

// ─── validateEndpointRef ──────────────────────────────────────────

describe("validateEndpointRef", () => {
	// null / undefined
	it("null / undefined has no errors", () => {
		expect(validateEndpointRef(null, "root")).toEqual([]);
		expect(validateEndpointRef(undefined, "root")).toEqual([]);
	});

	// ── OwnedEndpointRef ──────────────────────────────────────────

	describe("OwnedEndpointRef", () => {
		it("center anchor has no errors", () => {
			const ref = {
				owner: { id: "rect-1" },
				anchor: { kind: "center" },
			};
			expect(validateEndpointRef(ref, "root")).toEqual([]);
		});

		it("connectPoint anchor (with a valid id) has no errors", () => {
			const ref = {
				owner: { id: "rect-1" },
				anchor: { kind: "connectPoint", id: "topCenter" },
			};
			expect(validateEndpointRef(ref, "root")).toEqual([]);
		});

		it("errors when owner.id is not a string", () => {
			const ref = {
				owner: { id: 123 },
				anchor: { kind: "center" },
			};
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.owner.id")).toBe(true);
		});

		it("errors when anchor is missing", () => {
			const ref = { owner: { id: "rect-1" } };
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor")).toBe(true);
		});

		it("errors when anchor.kind is free (invalid for owned)", () => {
			const ref = {
				owner: { id: "rect-1" },
				anchor: { kind: "free", point: { x: 0, y: 0 } },
			};
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.kind")).toBe(true);
		});

		it("errors for an invalid anchor.kind value", () => {
			const ref = {
				owner: { id: "rect-1" },
				anchor: { kind: "unknown" },
			};
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.kind")).toBe(true);
		});

		it("errors for a connectPoint id that is not a non-empty string", () => {
			for (const id of ["", 42, null, undefined]) {
				const ref = {
					owner: { id: "rect-1" },
					anchor: { kind: "connectPoint", id },
				};
				const errors = validateEndpointRef(ref, "root");
				expect(errors.some((e) => e.path === "root.anchor.id")).toBe(true);
			}
		});

		it("accepts an id no built-in names, since a shape type may declare its own", () => {
			const ref = {
				owner: { id: "brace-1" },
				anchor: { kind: "connectPoint", id: "tip" },
			};
			expect(validateEndpointRef(ref, "root")).toEqual([]);
		});

		it("all ConnectPointIds have no errors", () => {
			const ids = ["topCenter", "rightCenter", "bottomCenter", "leftCenter"];
			for (const id of ids) {
				const ref = {
					owner: { id: "rect-1" },
					anchor: { kind: "connectPoint", id },
				};
				expect(validateEndpointRef(ref, "root")).toEqual([]);
			}
		});

		it("errors for a connectPoint anchor with id 'center' (center is a CenterAnchorSpec, not a connect point)", () => {
			const ref = {
				owner: { id: "rect-1" },
				anchor: { kind: "connectPoint", id: "center" },
			};
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.id")).toBe(true);
		});

		it("edge anchor with a valid side and ratio has no errors", () => {
			for (const side of ["top", "right", "bottom", "left"]) {
				for (const t of [0, 0.5, 1]) {
					const ref = {
						owner: { id: "rect-1" },
						anchor: { kind: "edge", side, t },
					};
					expect(validateEndpointRef(ref, "root")).toEqual([]);
				}
			}
		});

		it("errors for an edge anchor side that is not one of the four", () => {
			for (const side of ["topCenter", "middle", "", 1, null, undefined]) {
				const ref = {
					owner: { id: "rect-1" },
					anchor: { kind: "edge", side, t: 0.5 },
				};
				const errors = validateEndpointRef(ref, "root");
				expect(errors.some((e) => e.path === "root.anchor.side")).toBe(true);
			}
		});

		it("errors for an edge anchor ratio outside 0..1 or not a finite number", () => {
			for (const t of [
				-0.1,
				1.1,
				NaN,
				Infinity,
				-Infinity,
				"0.5",
				null,
				undefined,
			]) {
				const ref = {
					owner: { id: "rect-1" },
					anchor: { kind: "edge", side: "top", t },
				};
				const errors = validateEndpointRef(ref, "root");
				expect(errors.some((e) => e.path === "root.anchor.t")).toBe(true);
			}
		});
	});

	// ── FreeEndpointRef ───────────────────────────────────────────

	describe("FreeEndpointRef", () => {
		it("a valid free anchor has no errors", () => {
			const ref = { anchor: { kind: "free", point: { x: 10, y: 20 } } };
			expect(validateEndpointRef(ref, "root")).toEqual([]);
		});

		it("treats owner === null as a free endpoint with no errors", () => {
			const ref = {
				owner: null,
				anchor: { kind: "free", point: { x: 0, y: 0 } },
			};
			expect(validateEndpointRef(ref, "root")).toEqual([]);
		});

		it("errors when anchor is missing", () => {
			const errors = validateEndpointRef({}, "root");
			expect(errors.some((e) => e.path === "root.anchor")).toBe(true);
		});

		it("errors when anchor.kind is not free", () => {
			const ref = { anchor: { kind: "center" } };
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.kind")).toBe(true);
		});

		it("errors when anchor.point is missing", () => {
			const ref = { anchor: { kind: "free" } };
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.point")).toBe(true);
		});

		it("errors when anchor.point.x is not a number", () => {
			const ref = { anchor: { kind: "free", point: { x: "10", y: 0 } } };
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.point.x")).toBe(true);
		});

		it("errors when anchor.point.y is not a number", () => {
			const ref = { anchor: { kind: "free", point: { x: 0, y: "20" } } };
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.point.y")).toBe(true);
		});
	});
});
