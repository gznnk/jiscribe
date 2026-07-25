import { addObject, type AddObjectParams } from "./addObject";
import { connect, type ConnectParams } from "./connect";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { DocDefinitionsConfig } from "../schemas/plugin/resolveDocDefinitions";
import { resolveDocDefinitions } from "../schemas/plugin/resolveDocDefinitions";

/**
 * doc 定義駆動の doc-ops インスタンス。組み込み型もプラグイン型も、`createDocOps` に
 * 渡した定義（factory / features）に従って一様に扱う。
 */
export type DocOps = {
	addObject(doc: CanvasDoc, type: string, params: AddObjectParams): string;
	connect(doc: CanvasDoc, params: ConnectParams): string;
};

/**
 * {@link DocOps} を構築する。`config` は {@link resolveDocDefinitions} で解決され
 * （preset/plugin のマージと重複 type 検出のセマンティクスは createCanvasParser と相似形）、
 * 既定では組み込み定義のみを扱う。
 */
export const createDocOps = (config?: DocDefinitionsConfig): DocOps => {
	const definitions = resolveDocDefinitions(config, "createDocOps");
	return {
		addObject: (doc, type, params) => addObject(doc, type, params, definitions),
		connect: (doc, params) => connect(doc, params, definitions),
	};
};
