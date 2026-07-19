// Parser-only entry point (UI 非依存)。canvas 本体の ./parser と相似形: MCP や VSCode
// 拡張の Node 側診断など、definition.ts（React コンポーネントを含む）を経由せずに
// parse-time 検証へ参加したい消費者のための入口。
import type { ObjectParserExtension } from "@workspace/canvas/parser";

import { ContainerFeatures } from "./schema/ContainerDoc";
import { validateContainerDoc } from "./schema/validateContainerDoc";

export const containerParserExtension: ObjectParserExtension = {
	type: "container",
	features: ContainerFeatures,
	validateDoc: validateContainerDoc,
};
