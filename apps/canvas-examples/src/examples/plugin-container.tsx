import type { CanvasConfig, CanvasDoc, ToolbarEntry } from "@jiscribe/canvas";
import { Canvas } from "@jiscribe/canvas";
import { createCanvasParser } from "@jiscribe/canvas/doc";
import {
	annotationPlugin,
	annotationToolbarEntry,
} from "@jiscribe/plugin-annotation-shapes";
import {
	containerPlugin,
	containerToolbarEntry,
} from "@jiscribe/plugin-container-shapes";
import {
	flowchartPlugin,
	flowchartToolbarEntry,
} from "@jiscribe/plugin-flowchart-shapes";
import {
	generalPlugin,
	generalToolbarEntry,
} from "@jiscribe/plugin-general-shapes";
import { markdownPlugin } from "@jiscribe/plugin-markdown-shape";
import { stickyPlugin } from "@jiscribe/plugin-sticky-shape";
import { umlPlugin, umlToolbarEntry } from "@jiscribe/plugin-uml-shapes";

// The flowchart / container / markdown / sticky / general / annotation shapes have been
// removed from core, and
// @jiscribe/plugin-flowchart-shapes / @jiscribe/plugin-container-shapes /
// @jiscribe/plugin-markdown-shape / @jiscribe/plugin-sticky-shape /
// @jiscribe/plugin-general-shapes / @jiscribe/plugin-annotation-shapes are now their only
// source (packages/canvas/docs/13-authoring-plugins.md). This example demonstrates
// "adding shapes from an external plugin": passing the `CanvasPlugin` declaration to both
// createCanvasParser and the Canvas initialConfig is all it takes to get doc validation
// and the registration of the whole shape set.
const plugins = [
	flowchartPlugin,
	containerPlugin,
	markdownPlugin,
	stickyPlugin,
	umlPlugin,
	generalPlugin,
	annotationPlugin,
];

const initialConfig: CanvasConfig = { plugins };

// The annotation / flowchart / container / general categories and the markdown / sticky
// presets are not part of core's default layout (they come from plugins). The host decides
// their order and inserts them.
const toolbarLayout: ToolbarEntry[] = [
	{ kind: "preset", presetId: "rect" },
	{ kind: "preset", presetId: "ellipse" },
	{ kind: "preset", presetId: "polyline" },
	{ kind: "preset", presetId: "polygon" },
	{ kind: "preset", presetId: "sticky" },
	{ kind: "preset", presetId: "markdown" },
	flowchartToolbarEntry,
	umlToolbarEntry,
	containerToolbarEntry,
	generalToolbarEntry,
	annotationToolbarEntry,
];

const pluginContainerParser = createCanvasParser({ plugins });

const buildPluginContainerDoc = (): CanvasDoc => {
	const result = pluginContainerParser.parse(
		JSON.stringify({
			version: 1,
			root: [
				{
					id: "group-a",
					type: "container",
					x: 80,
					y: 80,
					width: 420,
					height: 300,
					headerFill: "#E3F2FD",
					stroke: "#1565C0",
					strokeWidth: 2,
					text: "Group A (plugin container)",
					fontColor: "#1565C0",
					fontWeight: "bold",
				},
				{
					id: "svc-a1",
					type: "rect",
					x: 120,
					y: 150,
					width: 150,
					height: 80,
					rx: 8,
					fill: "#E8F5E9",
					stroke: "#2E7D32",
					strokeWidth: 2,
					text: "Service A",
					fontColor: "#2E7D32",
				},
				{
					id: "cache-a",
					type: "ellipse",
					cx: 400,
					cy: 300,
					rx: 70,
					ry: 45,
					fill: "#FFF3E0",
					stroke: "#E65100",
					strokeWidth: 2,
					text: "Cache",
					fontColor: "#E65100",
				},
				{
					id: "group-b",
					type: "container",
					x: 560,
					y: 80,
					width: 380,
					height: 300,
					headerFill: "#F3E5F5",
					stroke: "#6A1B9A",
					strokeWidth: 2,
					text: "Group B (plugin container)",
					fontColor: "#6A1B9A",
					fontWeight: "bold",
				},
				{
					id: "svc-b1",
					type: "rect",
					x: 600,
					y: 150,
					width: 150,
					height: 80,
					rx: 8,
					fill: "#E3F2FD",
					stroke: "#1565C0",
					strokeWidth: 2,
					text: "Service B",
					fontColor: "#1565C0",
				},
				{
					id: "c-a1-b1",
					type: "connector",
					points: [],
					source: {
						owner: { id: "svc-a1" },
						anchor: { kind: "connectPoint", id: "rightCenter" },
					},
					target: {
						owner: { id: "svc-b1" },
						anchor: { kind: "connectPoint", id: "leftCenter" },
					},
					stroke: "#455A64",
					strokeWidth: 2,
					endArrow: "FilledTriangle",
					label: { text: "call" },
				},
			],
		}),
	);
	if (result.kind !== "ok") {
		throw new Error(`invalid plugin container doc: ${result.kind}`);
	}
	return result.doc;
};

const pluginContainerDoc = buildPluginContainerDoc();

/**
 * Demonstration of the plugin path: drag the container header and watch the rect /
 * ellipse inside move with it (move-together). If they do, the whole registration set —
 * mapper, component, behavior, factory and stencils — is working through the plugin.
 */
export function PluginContainerExample() {
	return (
		<Canvas
			doc={pluginContainerDoc}
			initialConfig={initialConfig}
			toolbar={{ layout: toolbarLayout }}
		/>
	);
}
