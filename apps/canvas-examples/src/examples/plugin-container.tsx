import type { CanvasConfig, CanvasDoc } from "@workspace/canvas";
import {
	Canvas,
	ObjectTypes,
	applyObjectDefinition,
	parseCanvasText,
} from "@workspace/canvas";
import { containerDefinition } from "@workspace/plugin-container-shapes";

// UC1 dogfood（docs/05_extensibility/uc1-container-extraction-log.md）: 「登録経路の
// 動作実証」。core の container 定義を objectTypes から除外し、外部プラグイン
// パッケージ（@workspace/plugin-container-shapes）の containerDefinition だけを
// customize 経由で登録する。プラグイン登録が失敗すれば canvasDoc の container が
// 「mapper not found」で壊れるため、描画・操作できること自体が経路の反証不能な実証になる。
const initialConfig: CanvasConfig = {
	objectTypes: ObjectTypes.filter((type) => type !== "container"),
	customize: (registries) =>
		applyObjectDefinition(registries, "container", containerDefinition),
};

const buildPluginContainerDoc = (): CanvasDoc => {
	const result = parseCanvasText(
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
 * shapeLibrary の登録一式がプラグイン経由で成立している証拠になる。
 */
export function PluginContainerExample() {
	return (
		<Canvas canvasDoc={pluginContainerDoc} initialConfig={initialConfig} />
	);
}
