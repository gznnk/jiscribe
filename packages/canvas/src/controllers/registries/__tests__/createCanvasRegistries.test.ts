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
		features: { type, geometry: "rect" },
		validateDoc: () => [],
		mapper: {
			toDoc: (state) => ({ id: state.id, type }),
			toState: (doc) => ({ id: doc.id, type }),
		},
		stateValidator: () => true,
		component: () => null,
		behavior: {
			moveByDelta: (state) => state,
			transformByGroup: (state) => state,
			rotateByGroup: (state) => state,
		},
		menu: [],
	});

describe("createCanvasRegistries", () => {
	describe("default (no config)", () => {
		it("registers every object type", () => {
			const registries = createCanvasRegistries();
			for (const type of ["rect", "ellipse", "polyline", "polygon"]) {
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
			expect(registries.objectMapper.getFeatures("polygon")).toBeUndefined();
			expect(registries.objectFactory.get("polygon")).toBeUndefined();
		});

		it("restricts the StencilLibrary presets to the enabled types", () => {
			const registries = createCanvasRegistries({ objectTypes: ["rect"] });
			const presetTypes = new Set(
				registries.stencil.all().map((preset) => preset.objectType),
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

		it("registers a plugin's text-edit overflow resolver, and only for that type", () => {
			const resolveSlotOverflow = (slotId: string) =>
				slotId === "name" ? ("grow" as const) : ("scroll" as const);
			const bandPlugin: CanvasPlugin = {
				id: "band-plugin",
				objects: {
					band: defineObject({
						...buildFakeDefinition("band"),
						textEditOverflow: resolveSlotOverflow,
					}),
				},
			};
			const registries = createCanvasRegistries({ plugins: [bandPlugin] });
			expect(registries.objectTextEditOverflow.get("band")).toBe(
				resolveSlotOverflow,
			);
			// A type that declares nothing stays on the default (scroll), which the
			// editor applies via resolveTextEditOverflow.
			expect(registries.objectTextEditOverflow.get("rect")).toBeUndefined();
		});

		it("registers a plugin's svgDefs, and only for the type declaring it", () => {
			const HaloDefs = () => null;
			const haloPlugin: CanvasPlugin = {
				id: "halo-plugin",
				objects: {
					halo: defineObject({
						...buildFakeDefinition("halo"),
						svgDefs: HaloDefs,
					}),
					plain: buildFakeDefinition("plain"),
				},
			};
			const registries = createCanvasRegistries({ plugins: [haloPlugin] });
			// No built-in contributes to <defs>, so the plugin's entry is the only one.
			expect(registries.objectSvgDefs.all()).toEqual([
				{ type: "halo", Component: HaloDefs },
			]);
		});

		it("derives menu sections from features when menu is omitted", () => {
			const plugin: CanvasPlugin = {
				id: "boxy-plugin",
				objects: {
					boxy: defineObject({
						features: {
							type: "boxy",
							geometry: "rect",
							transform: true,
							stroke: true,
							fill: true,
							text: "body",
						},
						validateDoc: () => [],
						mapper: {
							toDoc: (state) => ({ id: state.id, type: "boxy" }),
							toState: (doc) => ({ id: doc.id, type: "boxy" }),
						},
						stateValidator: () => true,
						component: () => null,
						behavior: {
							moveByDelta: (state) => state,
							transformByGroup: (state) => state,
							rotateByGroup: (state) => state,
						},
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
				// The box holds its text and nothing denies it, so the type may leave
				// `height` out and gets the switch (supportsAutoHeightType), placed
				// before the aspect lock so the two sizing toggles read as one run.
				{ id: "auto-height", items: [{ type: "autoHeight" }] },
				{ id: "transform", items: [{ type: "aspectRatio" }] },
			]);
			// The whole box is the region, so both vertical bases name it and the
			// basis switch is left out (hasInsetTextRegionType).
			expect(
				sections.some((section) => section.id === "text-vertical-basis"),
			).toBe(false);
		});

		it("adds the vertical-basis switch after the text section for a type that insets its region", () => {
			const plugin: CanvasPlugin = {
				id: "capped-plugin",
				objects: {
					capped: defineObject({
						features: {
							type: "capped",
							geometry: "rect",
							transform: true,
							stroke: true,
							fill: true,
							text: "body",
						},
						// A cap band the text stays below, as a cylinder has.
						textRegion: ({ width, height }) => ({
							x: -width / 2,
							y: -height / 2 + height * 0.2,
							width,
							height: height * 0.8,
						}),
						validateDoc: () => [],
						mapper: {
							toDoc: (state) => ({ id: state.id, type: "capped" }),
							toState: (doc) => ({ id: doc.id, type: "capped" }),
						},
						stateValidator: () => true,
						component: () => null,
						behavior: {
							moveByDelta: (state) => state,
							transformByGroup: (state) => state,
							rotateByGroup: (state) => state,
						},
					}),
				},
			};
			const registries = createCanvasRegistries({ plugins: [plugin] });
			expect(
				registries.objectMenu
					.getSections("capped")
					.map((section) => section.id),
			).toEqual([
				"style",
				"text",
				// The basis switch governs what the vertical alignment above it is
				// measured against, so it follows the text run rather than the sizing one.
				"text-vertical-basis",
				"auto-height",
				"transform",
			]);
		});

		it("throws when a definition declares stencils but no factory", () => {
			const brokenPlugin: CanvasPlugin = {
				id: "broken-plugin",
				objects: {
					widget: defineObject({
						...buildFakeDefinition("widget"),
						stencils: [
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
			expect(() => createCanvasRegistries({ plugins: [brokenPlugin] })).toThrow(
				/"widget".*stencils.*factory/,
			);
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
