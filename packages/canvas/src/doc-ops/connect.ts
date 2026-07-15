import { DocOperationError } from "./errors";
import { generateUniqueId } from "./ids";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
import type { ArrowType } from "../schemas/objects/types/ArrowType";
import type {
	ConnectPointId,
	OwnedEndpointRef,
} from "../schemas/objects/types/EndpointRef";

/**
 * 選択可能なアンカー位置。center は CenterAnchorSpec に、辺中点は connectPoint に変換する。
 * center は connectPoint の id にはならない。
 */
export type AnchorHandleId = "center" | ConnectPointId;

/** コネクター端点を持てるオブジェクト種別（各 Doc の connectable: true と一致）。 */
const CONNECTABLE_TYPES = ["rect", "ellipse", "diamond", "sticky"];

export type ConnectParams = {
	sourceId: string;
	targetId: string;
	sourceAnchor?: AnchorHandleId;
	targetAnchor?: AnchorHandleId;
	startArrow?: ArrowType;
	endArrow?: ArrowType;
};

/**
 * 2 つのオブジェクトをコネクターで接続し、生成した id を返す（doc は破壊的に変更）。
 *
 * source / target が root に存在し connectable であることを検証する。満たさない場合は
 * {@link DocOperationError}（利用者向けメッセージ付き）を投げる。
 */
export function connect(doc: CanvasDoc, params: ConnectParams): string {
	const sourceId = requireConnectable(doc, params.sourceId);
	const targetId = requireConnectable(doc, params.targetId);

	const id = generateUniqueId(doc, "connector");
	const connector = {
		id,
		type: "connector",
		source: buildEndpoint(sourceId, params.sourceAnchor),
		target: buildEndpoint(targetId, params.targetAnchor),
		points: [],
		...(params.startArrow !== undefined
			? { startArrow: params.startArrow }
			: {}),
		...(params.endArrow !== undefined ? { endArrow: params.endArrow } : {}),
	};
	doc.root.push(connector as unknown as ObjectDoc);
	return id;
}

/** root ツリーから id を探し、connectable なら id を返す。無ければ DocOperationError。 */
function requireConnectable(doc: CanvasDoc, id: string): string {
	// id の一意性は group children まで再帰で担保している（ids.ts）。接続対象の探索も同じく
	// 再帰させないと、group 内オブジェクトへ connect できない非対称になる（#115）。
	const found = findObjectById(doc.root, id);
	if (found === undefined) {
		throw new DocOperationError(`object not found: ${id}`);
	}
	if (!CONNECTABLE_TYPES.includes(found.type)) {
		throw new DocOperationError(
			`object ${id} is "${found.type}" which is not connectable (only ${CONNECTABLE_TYPES.join(" / ")}).`,
		);
	}
	return id;
}

/** root ツリーを group children まで再帰して、id が一致する最初のオブジェクトを返す。 */
function findObjectById(
	objects: ObjectDoc[],
	id: string,
): ObjectDoc | undefined {
	for (const object of objects) {
		if (object.id === id) {
			return object;
		}
		const children = (object as { children?: unknown }).children;
		if (Array.isArray(children)) {
			const found = findObjectById(children as ObjectDoc[], id);
			if (found !== undefined) {
				return found;
			}
		}
	}
	return undefined;
}

function buildEndpoint(
	ownerId: string,
	anchorId: AnchorHandleId | undefined,
): OwnedEndpointRef {
	const anchor: OwnedEndpointRef["anchor"] =
		anchorId === undefined || anchorId === "center"
			? { kind: "center" }
			: { kind: "connectPoint", id: anchorId };
	return { owner: { id: ownerId }, anchor };
}
