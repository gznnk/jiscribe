import type { Point } from "@workspace/geometry";
import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../../../../schemas/canvas/CanvasDoc";
import { isOrthogonalRouting } from "../../../../../../schemas/objects/types/ConnectorRouting";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { createInitialControllerState } from "../../../../../reducer/createInitialControllerState";
import { initializeObjectRegistry } from "../../../../../setup/initializeObjectRegistry";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { ConnectionAnchorEventHandler } from "../ConnectionAnchorEventHandler";

beforeAll(() => {
	initializeObjectRegistry();
});

/**
 * 図形を持たない空ドキュメント。
 * source は owner 参照のみ持たせ実体は不要（編集テストは target の free 端だけを動かす）。
 */
const emptyDoc: CanvasDoc = {
	version: 1,
	root: [],
} as unknown as CanvasDoc;

/**
 * owned source（host 図形に接続）+ free target の one-free コネクターを作る。
 * connector の不変条件「少なくとも一方 owned」を満たすため source を owned にする。
 * 端点編集テストでは target（free 端）を編集対象にする。
 */
const oneFreeConnector = (id: string, target: Point): ConnectorState =>
	({
		id,
		type: "connector",
		points: [],
		source: { owner: { type: "rect", id: "host" }, anchor: { kind: "center" } },
		target: { anchor: { kind: "free", point: target } },
		stroke: "auto",
		strokeWidth: 2,
		endArrow: "ConcaveTriangle",
	}) as unknown as ConnectorState;

/**
 * コネクター群を objects / rootIds に注入し、編集の基点となる
 * eventStartSnapshot（実機では handleGesture が dragStart 時に作る）も用意した state を作る。
 * コネクターは rootIds に混在管理されるため rootIds へ積む。
 */
const stateWithConnectors = (
	connectors: ConnectorState[],
): CanvasControllerState => {
	const base = createInitialControllerState(emptyDoc);
	const objects = { ...base.objects };
	for (const c of connectors) {
		objects[c.id] = c;
	}
	return {
		...base,
		objects,
		rootIds: [...base.rootIds, ...connectors.map((c) => c.id)],
		eventStartSnapshot: {
			objects,
			keyPoints: {},
			snapCandidates: { x: [], y: [] },
			selectedIds: [],
			selectedIdsWithDescendants: new Set(),
			multiSelectGroup: null,
			viewport: base.viewport,
		},
	};
};

/** ドラッグ系の CanvasEvent を作る。 */
const dragEvent = (
	type: "dragStart" | "dragEnd",
	targetId: string,
	last: Point,
): CanvasEvent =>
	({
		type,
		target: null,
		targetId,
		targetKind: "control",
		start: { x: 0, y: 0 },
		last,
		delta: { x: 0, y: 0 },
		clientStart: { x: 0, y: 0 },
		clientLast: { x: 0, y: 0 },
		clientDelta: { x: 0, y: 0 },
		mods: { shift: false, ctrl: false, alt: false, meta: false },
		hovered: [],
		time: 0,
		button: 0,
	}) as unknown as CanvasEvent;

describe("ConnectionAnchorEventHandler 端点編集（実体直接編集）", () => {
	const handler = new ConnectionAnchorEventHandler();

	it("編集してもコネクターの重なり順（rootIds）が変わらない", () => {
		const state = stateWithConnectors([
			oneFreeConnector("c1", { x: 10, y: 10 }),
			oneFreeConnector("c2", { x: 20, y: 20 }),
			oneFreeConnector("c3", { x: 30, y: 30 }),
		]);

		const afterStart = handler.handle(
			state,
			dragEvent("dragStart", "connection-anchor:edit:c1:target", {
				x: 10,
				y: 10,
			}),
		);
		const afterEnd = handler.handle(
			afterStart,
			dragEvent("dragEnd", "connection-anchor:edit:c1:target", {
				x: 50,
				y: 50,
			}),
		);

		expect(afterEnd.rootIds).toEqual(["c1", "c2", "c3"]);
	});

	it("編集中は overlay（pendingConnector）を使わず実体を直接更新する", () => {
		const state = stateWithConnectors([
			oneFreeConnector("c1", { x: 10, y: 10 }),
		]);

		const afterStart = handler.handle(
			state,
			dragEvent("dragStart", "connection-anchor:edit:c1:target", {
				x: 10,
				y: 10,
			}),
		);
		// dragStart では pendingConnector を作らず、編集対象だけ記録する
		expect(afterStart.pendingConnector).toBeNull();
		expect(afterStart.editingConnectorId).toBe("c1");

		// dragEnd で実体（objects["c1"]）の target が直接動く
		const afterEnd = handler.handle(
			afterStart,
			dragEvent("dragEnd", "connection-anchor:edit:c1:target", {
				x: 80,
				y: 80,
			}),
		);
		const updated = afterEnd.objects["c1"] as ConnectorState;
		expect(updated.target.anchor).toEqual({
			kind: "free",
			point: { x: 80, y: 80 },
		});
		expect(afterEnd.pendingConnector).toBeNull();
		expect(afterEnd.editingConnectorId).toBeNull();
	});

	it("端点を元の位置に戻す no-op 編集では objects 参照を据え置く（コミットされない）", () => {
		const state = stateWithConnectors([
			oneFreeConnector("c1", { x: 10, y: 10 }),
		]);

		const afterStart = handler.handle(
			state,
			dragEvent("dragStart", "connection-anchor:edit:c1:target", {
				x: 10,
				y: 10,
			}),
		);
		// dragEnd を元の target 位置（10,10）で確定 → 端点は変化なし
		const afterEnd = handler.handle(
			afterStart,
			dragEvent("dragEnd", "connection-anchor:edit:c1:target", {
				x: 10,
				y: 10,
			}),
		);

		// objects 参照が変わらない＝handleGesture の自動コミット判定が走らない
		expect(afterEnd.objects).toBe(state.objects);
		expect(afterEnd.editingConnectorId).toBeNull();
	});

	it("端点が変化した編集では objects 参照が変わる（コミット対象）", () => {
		const state = stateWithConnectors([
			oneFreeConnector("c1", { x: 10, y: 10 }),
		]);

		const afterStart = handler.handle(
			state,
			dragEvent("dragStart", "connection-anchor:edit:c1:target", {
				x: 10,
				y: 10,
			}),
		);
		const afterEnd = handler.handle(
			afterStart,
			dragEvent("dragEnd", "connection-anchor:edit:c1:target", {
				x: 99,
				y: 99,
			}),
		);

		expect(afterEnd.objects).not.toBe(state.objects);
		const updated = afterEnd.objects["c1"] as ConnectorState;
		expect(updated.target.anchor).toEqual({
			kind: "free",
			point: { x: 99, y: 99 },
		});
		expect(afterEnd.rootIds).toEqual(["c1"]);
	});

	it("新規作成したコネクターは rootIds の末尾（最前面）へ挿入される", () => {
		// source となる図形を rootIds に1つ置く（前面挿入の確認用）。
		const base = stateWithConnectors([]);
		const state: CanvasControllerState = {
			...base,
			objects: {
				...base.objects,
				"rect-1": { id: "rect-1", type: "rect" } as unknown as ObjectState,
			},
			rootIds: ["rect-1"],
		};

		const afterStart = handler.handle(
			state,
			dragEvent("dragStart", "connection-anchor:create:rect-1:rightCenter", {
				x: 10,
				y: 10,
			}),
		);
		const afterEnd = handler.handle(
			afterStart,
			dragEvent("dragEnd", "connection-anchor:create:rect-1:rightCenter", {
				x: 80,
				y: 80,
			}),
		);

		// 新規コネクターは rootIds 末尾（最前面）に入り、rect-1 より上に描かれる
		expect(afterEnd.rootIds.length).toBe(2);
		expect(afterEnd.rootIds[0]).toBe("rect-1");
		const newId = afterEnd.rootIds[1];
		expect(afterEnd.objects[newId]?.type).toBe("connector");
	});

	it("新規コネクターは routing を省略する（省略時の既定 orthogonal に従う）", () => {
		const base = stateWithConnectors([]);
		const state: CanvasControllerState = {
			...base,
			objects: {
				...base.objects,
				"rect-1": { id: "rect-1", type: "rect" } as unknown as ObjectState,
			},
			rootIds: ["rect-1"],
		};

		const afterStart = handler.handle(
			state,
			dragEvent("dragStart", "connection-anchor:create:rect-1:rightCenter", {
				x: 10,
				y: 10,
			}),
		);

		// 明示フィールドは持たず（省略）、既定解釈で orthogonal になる。
		expect(afterStart.pendingConnector?.routing).toBeUndefined();
		expect(isOrthogonalRouting(afterStart.pendingConnector?.routing)).toBe(
			true,
		);
	});
});
