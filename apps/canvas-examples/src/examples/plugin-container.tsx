import type { CanvasConfig, CanvasDoc, ToolbarEntry } from "@workspace/canvas";
import {
	Canvas,
	annotationToolbarEntry,
	createCanvasParser,
	flowchartToolbarEntry,
	generalToolbarEntry,
} from "@workspace/canvas";
import {
	containerPlugin,
	containerToolbarEntry,
} from "@workspace/plugin-container-shapes";

// container 図形は core から削除され、@workspace/plugin-container-shapes が唯一の
// 供給元（docs/05_extensibility/canvas-plugin-design.md）。この example は
// 「外部プラグイン図形の追加」の実証: `CanvasPlugin` 宣言 1 つ（containerPlugin）を
// createCanvasParser と Canvas の initialConfig の両方に渡すだけで、doc の検証と
// 図形一式の登録が揃う。
const plugins = [containerPlugin];

const initialConfig: CanvasConfig = { plugins };

// container カテゴリは core の既定 layout に含まれない（プラグイン供給）。
// 従来どおり flowchart 直後に出すため、ホスト側で container スロットを差し込む。
const toolbarLayout: ToolbarEntry[] = [
	{ kind: "preset", presetId: "rect" },
	{ kind: "preset", presetId: "ellipse" },
	{ kind: "preset", presetId: "polyline" },
	{ kind: "preset", presetId: "polygon" },
	{ kind: "preset", presetId: "sticky" },
	{ kind: "preset", presetId: "rect-markdown" },
	flowchartToolbarEntry,
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
 * プラグイン経路の実証例: container ヘッダーをドラッグして中の rect / ellipse が
 * 一緒に動く（move-together）ことを確認できる。動けば mapper・component・behavior・
 * factory / stencilPresets の登録一式がプラグイン経由で成立している証拠になる。
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
