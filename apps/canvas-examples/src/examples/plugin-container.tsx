import type { CanvasConfig, CanvasDoc, ToolbarEntry } from "@workspace/canvas";
import { Canvas } from "@workspace/canvas";
import { createCanvasParser } from "@workspace/canvas/doc";
import { annotationPlugin } from "@workspace/plugin-annotation-shapes";
import {
	containerPlugin,
	containerToolbarEntry,
} from "@workspace/plugin-container-shapes";
import {
	flowchartPlugin,
	flowchartToolbarEntry,
} from "@workspace/plugin-flowchart-shapes";
import {
	generalPlugin,
	generalToolbarEntry,
} from "@workspace/plugin-general-shapes";
import { markdownPlugin } from "@workspace/plugin-markdown-shape";
import { stickyPlugin } from "@workspace/plugin-sticky-shape";
import { umlPlugin, umlToolbarEntry } from "@workspace/plugin-uml-shapes";

// flowchart / container / markdown / sticky / general 図形は core から削除され、それぞれ
// @workspace/plugin-flowchart-shapes / @workspace/plugin-container-shapes /
// @workspace/plugin-markdown-shape / @workspace/plugin-sticky-shape /
// @workspace/plugin-general-shapes が唯一の供給元。annotation 図形
// （@workspace/plugin-annotation-shapes）は最初から core の外
// （docs/05_extensibility/plugin-architecture-requirements.md）。この example は
// 「外部プラグイン図形の追加」の実証: `CanvasPlugin` 宣言を createCanvasParser と
// Canvas の initialConfig の両方に渡すだけで、doc の検証と図形一式の登録が揃う。
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

// flowchart / container / general カテゴリと markdown / sticky / brace プリセットは core の既定
// layout に含まれない（プラグイン供給）。従来どおりの並びで出すため、ホスト側で差し込む。
const toolbarLayout: ToolbarEntry[] = [
	{ kind: "preset", presetId: "rect" },
	{ kind: "preset", presetId: "ellipse" },
	{ kind: "preset", presetId: "polyline" },
	{ kind: "preset", presetId: "polygon" },
	{ kind: "preset", presetId: "callout" },
	{ kind: "preset", presetId: "brace" },
	{ kind: "preset", presetId: "sticky" },
	{ kind: "preset", presetId: "markdown" },
	flowchartToolbarEntry,
	containerToolbarEntry,
	umlToolbarEntry,
	generalToolbarEntry,
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
 * プラグイン経路の実証例: container ヘッダーをドラッグして中の rect / ellipse が
 * 一緒に動く（move-together）ことを確認できる。動けば mapper・component・behavior・
 * factory / stencils の登録一式がプラグイン経由で成立している証拠になる。
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
