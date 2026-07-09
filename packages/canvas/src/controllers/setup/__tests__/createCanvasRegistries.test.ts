import { describe, it, expect } from "vitest";

import { createCanvasRegistries } from "../createCanvasRegistries";

describe("createCanvasRegistries", () => {
	describe("default (no config)", () => {
		it("registers every object type", () => {
			const registries = createCanvasRegistries();
			for (const type of ["rect", "ellipse", "diamond", "sticky"]) {
				expect(registries.objectMapper.getFeatures(type)).toBeDefined();
			}
			// gesture handlers are type-independent and always registered
			expect(
				registries.gestureHandler.getHandler("object-handler"),
			).toBeDefined();
		});

		it("registers all commands", () => {
			const registries = createCanvasRegistries();
			expect(registries.command.get("undo")).toBeDefined();
			expect(registries.command.get("redo")).toBeDefined();
			expect(registries.command.getAll().length).toBeGreaterThan(1);
		});
	});

	describe("restricted objectTypes", () => {
		it("only enables the listed types", () => {
			const registries = createCanvasRegistries({
				objectTypes: ["rect", "ellipse"],
			});
			expect(registries.objectMapper.getFeatures("rect")).toBeDefined();
			expect(registries.objectMapper.getFeatures("ellipse")).toBeDefined();
			expect(registries.objectMapper.getFeatures("diamond")).toBeUndefined();
			expect(registries.shapeFactory.get("diamond")).toBeUndefined();
		});

		it("restricts the ShapeLibrary presets to the enabled types", () => {
			const registries = createCanvasRegistries({ objectTypes: ["rect"] });
			const presetTypes = new Set(
				registries.shapePreset.all().map((preset) => preset.objectType),
			);
			expect(presetTypes.has("rect")).toBe(true);
			expect(presetTypes.has("ellipse")).toBe(false);
		});

		it("still registers all gesture handlers (type-independent)", () => {
			const registries = createCanvasRegistries({ objectTypes: ["rect"] });
			expect(
				registries.gestureHandler.getHandler("object-handler"),
			).toBeDefined();
			expect(
				registries.gestureHandler.getHandler("canvas-handler"),
			).toBeDefined();
		});
	});

	describe("restricted commands", () => {
		it("only registers the listed command ids", () => {
			const registries = createCanvasRegistries({ commands: ["undo"] });
			expect(registries.command.get("undo")).toBeDefined();
			expect(registries.command.get("redo")).toBeUndefined();
			expect(registries.command.getAll()).toHaveLength(1);
		});
	});

	describe("customize hook", () => {
		it("runs against the built bundle", () => {
			let seen: unknown = null;
			const registries = createCanvasRegistries({
				customize: (built) => {
					seen = built;
				},
			});
			expect(seen).toBe(registries);
		});
	});

	describe("isolation", () => {
		it("returns an independent bundle each call", () => {
			const a = createCanvasRegistries();
			const b = createCanvasRegistries();
			expect(a).not.toBe(b);
			expect(a.command).not.toBe(b.command);
		});
	});
});
