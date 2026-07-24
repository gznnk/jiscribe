import { describe, it, expect } from "vitest";

import type { CanvasPlugin } from "../../../plugin/CanvasPlugin";
import { defineObject } from "../../../plugin/ObjectTypeDefinition";
import type { ObjectTypeDefinition } from "../../../plugin/ObjectTypeDefinition";
import { createCanvasRegistries } from "../createCanvasRegistries";

// Minimal stand-in for a plugin object type (mirrors how plugin-container-shapes
// registers "container"), built entirely from the same `defineObject` builtins
// use so this suite has no dependency beyond this layer.
const buildFakeDefinition = (type: string): ObjectTypeDefinition =>
	defineObject({
		mapper: {
			toDoc: (state) => ({ id: state.id, type }),
			toState: (doc) => ({ id: doc.id, type }),
		},
		features: { type, geometry: "rect" },
		component: () => null,
		behavior: {
			moveByDelta: (state) => state,
			transformByGroup: (state) => state,
			rotateByGroup: (state) => state,
		},
		menu: [],
		stateValidator: () => true,
	});

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
			expect(registries.objectFactory.get("diamond")).toBeUndefined();
		});

		it("restricts the StencilLibrary presets to the enabled types", () => {
			const registries = createCanvasRegistries({ objectTypes: ["rect"] });
			const presetTypes = new Set(
				registries.stencilPreset.all().map((preset) => preset.objectType),
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

	describe("plugins", () => {
		it("registers a plugin's object types", () => {
			const starPlugin: CanvasPlugin = {
				id: "star-plugin",
				objects: { star: buildFakeDefinition("star") },
			};
			const registries = createCanvasRegistries({ plugins: [starPlugin] });
			expect(registries.objectMapper.getFeatures("star")).toBeDefined();
		});

		it("derives menu sections from features when menu is omitted", () => {
			const plugin: CanvasPlugin = {
				id: "boxy-plugin",
				objects: {
					boxy: defineObject({
						mapper: {
							toDoc: (state) => ({ id: state.id, type: "boxy" }),
							toState: (doc) => ({ id: doc.id, type: "boxy" }),
						},
						features: {
							type: "boxy",
							geometry: "rect",
							transform: true,
							stroke: true,
							fill: true,
							text: true,
						},
						component: () => null,
						behavior: {
							moveByDelta: (state) => state,
							transformByGroup: (state) => state,
							rotateByGroup: (state) => state,
						},
						stateValidator: () => true,
					}),
				},
			};
			const registries = createCanvasRegistries({ plugins: [plugin] });
			const sections = registries.objectMenu.getSections("boxy");
			expect(sections).toEqual([
				{
					id: "style",
					items: [
						{ type: "backgroundColor" },
						{ type: "borderColor" },
						{ type: "borderStyle", radius: false },
					],
				},
				{
					id: "text",
					items: [{ type: "fontStyle" }, { type: "textAlignment" }],
				},
				{ id: "transform", items: [{ type: "aspectRatio" }] },
			]);
		});

		it("throws when a definition declares stencilPresets but no factory", () => {
			const brokenPlugin: CanvasPlugin = {
				id: "broken-plugin",
				objects: {
					widget: defineObject({
						...buildFakeDefinition("widget"),
						stencilPresets: [
							{
								id: "widget",
								objectType: "widget",
								label: "Widget",
								icon: () => null,
							},
						],
					}),
				},
			};
			expect(() =>
				createCanvasRegistries({ plugins: [brokenPlugin] }),
			).toThrow(/"widget".*stencilPresets.*factory/);
		});

		it("throws when a plugin's object type collides with a built-in", () => {
			const rectPlugin: CanvasPlugin = {
				id: "rect-plugin",
				objects: { rect: buildFakeDefinition("rect") },
			};
			expect(() => createCanvasRegistries({ plugins: [rectPlugin] })).toThrow(
				/rect-plugin.*"rect"/,
			);
		});

		it("throws when two plugins declare the same object type", () => {
			const pluginA: CanvasPlugin = {
				id: "plugin-a",
				objects: { star: buildFakeDefinition("star") },
			};
			const pluginB: CanvasPlugin = {
				id: "plugin-b",
				objects: { star: buildFakeDefinition("star") },
			};
			expect(() =>
				createCanvasRegistries({ plugins: [pluginA, pluginB] }),
			).toThrow(/plugin-b.*"star".*plugin-a/);
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
