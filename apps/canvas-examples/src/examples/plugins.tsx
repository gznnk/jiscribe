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
import {
	lucideIconPlugin,
	lucideIconToolbarEntry,
} from "@jiscribe/plugin-lucide-icon-shape";
import { markdownPlugin } from "@jiscribe/plugin-markdown-shape";
import { stickyPlugin } from "@jiscribe/plugin-sticky-shape";
import { umlPlugin, umlToolbarEntry } from "@jiscribe/plugin-uml-shapes";

// One plugin ships one shape family, complete with its doc schema, its rendering and
// editing behaviour, and its toolbar stencils. The shapes on this canvas come from:
//   flowchart  db
//   general    actor / server / queue / gear
//   uml        record
//   annotation brace
//   container  container
//   sticky     sticky
//   markdown   markdown
//   lucide     lucideIcon
// Only rect / ellipse / polyline / polygon / text / connector are core.
const plugins = [
	flowchartPlugin,
	containerPlugin,
	markdownPlugin,
	stickyPlugin,
	umlPlugin,
	generalPlugin,
	annotationPlugin,
	lucideIconPlugin,
];

// The same array has to reach BOTH sides, and neither side complains when it does not:
// initialConfig registers the shapes for rendering and editing, createCanvasParser
// teaches doc validation the same types. Register only with Canvas and the parser strips
// every plugin object out of the doc as an unknown type (it lands in result.warnings, not
// in an error); register only with the parser and the doc validates but Canvas has no
// definition to draw the shapes with. Either way the shapes just go missing.
const initialConfig: CanvasConfig = { plugins };
const pluginParser = createCanvasParser({ plugins });

// Core's default layout knows nothing of plugin shapes, so the host lays them out: the
// categories come from the plugins (flowchartToolbarEntry and friends) and the sticky /
// markdown presets are single-shape entries referenced by preset id.
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
	lucideIconToolbarEntry,
];

const legendMarkdown = [
	"### Shapes on this canvas",
	"",
	"- **flowchart** — orders (db)",
	"- **general** — Customer, api, events, worker",
	"- **uml** — Order (record)",
	"- **annotation** — the brace below",
	"- **container** — order-service",
	"- **sticky** — the yellow note",
	"- **markdown** — this card",
	"- **lucide-icon** — the lock over the request arrow",
].join("\n");

const buildPluginsDoc = (): CanvasDoc => {
	const result = pluginParser.parse(
		JSON.stringify({
			version: 1,
			root: [
				{
					id: "order-service",
					type: "container",
					x: 210,
					y: 85,
					width: 460,
					height: 200,
					text: "order-service",
					fontWeight: "bold",
				},
				{
					id: "customer",
					type: "actor",
					x: 50,
					y: 140,
					width: 80,
					height: 100,
					text: "Customer",
				},
				{
					id: "api",
					type: "server",
					x: 240,
					y: 135,
					width: 85,
					height: 105,
					text: "api",
				},
				{
					id: "events",
					type: "queue",
					x: 365,
					// Centred on 187.5 so the api / worker connectors stay straight
					y: 153.5,
					width: 145,
					height: 68,
					text: "events",
				},
				{
					id: "worker",
					type: "gear",
					x: 550,
					y: 140,
					width: 95,
					height: 95,
					text: "worker",
				},
				{
					id: "orders-store",
					type: "db",
					x: 375,
					y: 345,
					width: 130,
					height: 110,
					text: "orders",
				},
				{
					id: "order-entity",
					type: "record",
					x: 545,
					// Centred on 400 so the orders connector stays straight
					y: 342,
					width: 200,
					height: 116,
					text: {
						name: { text: "Order" },
						attributes: {
							text: [
								"id: uuid",
								"customer: string",
								"total: number",
								"status: enum",
							],
						},
					},
				},
				{
					id: "persistence-brace",
					type: "brace",
					x: 375,
					y: 480,
					width: 370,
					height: 22,
					direction: "down",
					text: "persistence",
				},
				{
					id: "auth-lock",
					type: "lucideIcon",
					x: 169,
					y: 143,
					width: 32,
					height: 32,
					icon: "lock",
				},
				{
					id: "legend",
					type: "markdown",
					x: 700,
					y: 85,
					width: 290,
					height: 185,
					text: legendMarkdown,
					fontSize: 13,
					textAlign: "left",
					verticalAlign: "top",
				},
				{
					id: "reminder",
					type: "sticky",
					x: 800,
					y: 345,
					width: 175,
					height: 125,
					text: "Pass plugins to Canvas and to createCanvasParser",
				},
				{
					id: "customer-to-api",
					type: "connector",
					points: [],
					source: {
						owner: { id: "customer" },
						anchor: { kind: "connectPoint", id: "rightCenter" },
					},
					target: {
						owner: { id: "api" },
						anchor: { kind: "connectPoint", id: "leftCenter" },
					},
					endArrow: "FilledTriangle",
					label: { text: "POST /orders", fontSize: 12 },
				},
				{
					id: "api-to-events",
					type: "connector",
					points: [],
					source: {
						owner: { id: "api" },
						anchor: { kind: "connectPoint", id: "rightCenter" },
					},
					target: {
						owner: { id: "events" },
						anchor: { kind: "connectPoint", id: "leftCenter" },
					},
					endArrow: "FilledTriangle",
				},
				{
					id: "events-to-worker",
					type: "connector",
					points: [],
					source: {
						owner: { id: "events" },
						anchor: { kind: "connectPoint", id: "rightCenter" },
					},
					target: {
						owner: { id: "worker" },
						anchor: { kind: "connectPoint", id: "leftCenter" },
					},
					endArrow: "FilledTriangle",
				},
				{
					id: "service-to-store",
					type: "connector",
					points: [],
					source: {
						owner: { id: "order-service" },
						anchor: { kind: "connectPoint", id: "bottomCenter" },
					},
					target: {
						owner: { id: "orders-store" },
						anchor: { kind: "connectPoint", id: "topCenter" },
					},
					endArrow: "FilledTriangle",
				},
				{
					id: "store-to-entity",
					type: "connector",
					points: [],
					source: {
						owner: { id: "orders-store" },
						anchor: { kind: "connectPoint", id: "rightCenter" },
					},
					target: {
						owner: { id: "order-entity" },
						anchor: { kind: "connectPoint", id: "leftCenter" },
					},
					strokeDashType: "dashed",
				},
			],
		}),
	);
	if (result.kind !== "ok") {
		throw new Error(`invalid plugins doc: ${result.kind}`);
	}
	return result.doc;
};

const pluginsDoc = buildPluginsDoc();

/**
 * Assembling a canvas out of shape plugins: the eight shipped plugins are registered at
 * once, and their shapes are drawn, edited and validated exactly like the core ones. Open
 * the toolbar to draw more of them.
 */
export function PluginsExample() {
	return (
		<Canvas
			doc={pluginsDoc}
			initialConfig={initialConfig}
			toolbar={{ layout: toolbarLayout }}
		/>
	);
}
