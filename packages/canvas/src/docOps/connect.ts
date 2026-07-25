import { DocOperationError } from "./errors";
import { generateUniqueId } from "./ids";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
import type { ArrowType } from "../schemas/objects/types/ArrowType";
import { defaultRoutingForAnchors } from "../schemas/objects/types/ConnectorRouting";
import type {
	ConnectPointId,
	OwnedEndpointRef,
} from "../schemas/objects/types/EndpointRef";
import type { ObjectDocDefinition } from "../schemas/plugin/ObjectDocDefinition";

/**
 * 選択可能なアンカー位置。center は CenterAnchorSpec に、辺中点は connectPoint に変換する。
 * center は connectPoint の id にはならない。
 */
export type AnchorHandleId = "center" | ConnectPointId;

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
export function connect(
	doc: CanvasDoc,
	params: ConnectParams,
	definitions: ReadonlyMap<string, ObjectDocDefinition>,
): string {
	const sourceId = requireConnectable(doc, params.sourceId, definitions);
	const targetId = requireConnectable(doc, params.targetId, definitions);

	const id = generateUniqueId(doc, "connector");
	const source = buildEndpoint(sourceId, params.sourceAnchor);
	const target = buildEndpoint(targetId, params.targetAnchor);
	// center 接続は straight を既定にする（両端 connectPoint のときだけ orthogonal で省略）。
	const routing = defaultRoutingForAnchors(source.anchor, target.anchor);
	const connector = {
		id,
		type: "connector",
		source,
		target,
		points: [],
		...(routing !== undefined ? { routing } : {}),
		...(params.startArrow !== undefined
			? { startArrow: params.startArrow }
			: {}),
		...(params.endArrow !== undefined ? { endArrow: params.endArrow } : {}),
	};
	doc.root.push(connector as unknown as ObjectDoc);
	return id;
}

/** root ツリーから id を探し、features.connectable なら id を返す。無ければ DocOperationError。 */
function requireConnectable(
	doc: CanvasDoc,
	id: string,
	definitions: ReadonlyMap<string, ObjectDocDefinition>,
): string {
	// id の一意性は group children まで再帰で担保している（ids.ts）。接続対象の探索も同じく
	// 再帰させないと、group 内オブジェクトへ connect できない非対称になる（#115）。
	const found = findObjectById(doc.root, id);
	if (found === undefined) {
		throw new DocOperationError(`object not found: ${id}`);
	}
	const definition = definitions.get(found.type);
	if (definition === undefined || definition.features.connectable !== true) {
		const connectableTypes = [...definitions]
			.filter(([, candidate]) => candidate.features.connectable === true)
			.map(([candidateType]) => candidateType);
		throw new DocOperationError(
			`object ${id} is "${found.type}" which is not connectable (connectable: ${connectableTypes.join(" / ")}).`,
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
