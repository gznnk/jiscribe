import { DocOperationError } from "./errors";
import { generateUniqueId } from "./ids";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
import type { ObjectDocDefinition } from "../schemas/plugin/ObjectDocDefinition";

export type AddObjectParams = {
	/** 左上 x（px）。 */
	x: number;
	/** 左上 y（px）。 */
	y: number;
	width?: number;
	height?: number;
	text?: string;
};

/**
 * `type` のオブジェクトを追加し、生成した id を返す（doc は破壊的に変更）。
 *
 * 座標は左上基準（x/y）＋実効 width/height の外接矩形として扱う。factory が
 * `createDocFromBounds`（矩形系・楕円系ともに正しく寸法へ写す唯一の一様な入口）を
 * 持てばそれを、無ければ中心基準の `createDoc` へフォールバックする。width/height 省略時は
 * `calcDimensions` の既定寸法を使う。id は factory の UUID を `${type}-N` 連番へ差し替える。
 *
 * 未知の type・factory を持たない type（group / connector / svg 等）は {@link DocOperationError}。
 */
export const addObject = (
	doc: CanvasDoc,
	type: string,
	params: AddObjectParams,
	definitions: ReadonlyMap<string, ObjectDocDefinition>,
): string => {
	const definition = definitions.get(type);
	if (definition === undefined) {
		throw new DocOperationError(
			`unknown object type "${type}" (known: ${[...definitions.keys()].join(", ")})`,
		);
	}
	const factory = definition.factory;
	if (factory === undefined) {
		const creatableTypes = [...definitions]
			.filter(([, candidate]) => candidate.factory !== undefined)
			.map(([candidateType]) => candidateType);
		throw new DocOperationError(
			`object type "${type}" cannot be created programmatically (creatable: ${creatableTypes.join(", ")})`,
		);
	}

	const dimensions = factory.calcDimensions();
	const width = params.width ?? dimensions.halfWidth * 2;
	const height = params.height ?? dimensions.halfHeight * 2;
	const textOverride = params.text !== undefined ? { text: params.text } : {};

	let created: ObjectDoc | null;
	if (factory.createDocFromBounds !== undefined) {
		// minSize 0: プログラム生成では対話ドラッグのような「小さすぎ＝誤操作」棄却は不要。
		created = factory.createDocFromBounds(
			params.x,
			params.y,
			params.x + width,
			params.y + height,
			textOverride,
			0,
		);
	} else {
		created = factory.createDoc(
			{ x: params.x + width / 2, y: params.y + height / 2 },
			{ width, height, ...textOverride },
		);
	}
	if (created === null) {
		throw new DocOperationError(
			`object type "${type}" could not be created at size ${width}x${height}`,
		);
	}

	created.id = generateUniqueId(doc, type);
	doc.root.push(created);
	return created.id;
};
