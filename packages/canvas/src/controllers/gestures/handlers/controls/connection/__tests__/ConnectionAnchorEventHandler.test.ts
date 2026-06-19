import type { Point } from "@workspace/geometry";
import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../../../../schemas/canvas/CanvasDoc";
import type { ConnectorState } from "../../../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { createInitialControllerState } from "../../../../../reducer/createInitialControllerState";
import { initializeObjectRegistry } from "../../../../../setup/initializeObjectRegistry";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { ConnectionAnchorEventHandler } from "../ConnectionAnchorEventHandler";

beforeAll(() => {
	initializeObjectRegistry();
});

/** 図形を持たない空ドキュメント。端点はすべて free なので rect は不要。 */
const emptyDoc: CanvasDoc = {
	version: 1,
	root: [],
	connectors: [],
} as unknown as CanvasDoc;

/** free 端点を持つコネクターの ConnectorState を作る。 */
const freeConnector = (
	id: string,
	source: Point,
	target: Point,
): ConnectorState =>
	({
		id,
		type: "connector",
		points: [],
		source: { anchor: { kind: "free", point: source } },
		target: { anchor: { kind: "free", point: target } },
		stroke: "#6b7280",
		strokeWidth: 2,
		endArrow: "ConcaveTriangle",
	}) as unknown as ConnectorState;

/**
 * コネクター群を objects / connectorIds に注入し、編集の基点となる
 * eventStartSnapshot（実機では handleGesture が dragStart 時に作る）も用意した state を作る。
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
		connectorIds: connectors.map((c) => c.id),
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

	it("編集してもコネクターの重なり順（connectorIds）が変わらない", () => {
		const state = stateWithConnectors([
			freeConnector("c1", { x: 0, y: 0 }, { x: 10, y: 10 }),
			freeConnector("c2", { x: 0, y: 0 }, { x: 20, y: 20 }),
			freeConnector("c3", { x: 0, y: 0 }, { x: 30, y: 30 }),
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

		expect(afterEnd.connectorIds).toEqual(["c1", "c2", "c3"]);
	});

	it("編集中は overlay（pendingConnector）を使わず実体を直接更新する", () => {
		const state = stateWithConnectors([
			freeConnector("c1", { x: 0, y: 0 }, { x: 10, y: 10 }),
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
			freeConnector("c1", { x: 0, y: 0 }, { x: 10, y: 10 }),
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
			freeConnector("c1", { x: 0, y: 0 }, { x: 10, y: 10 }),
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
		expect(afterEnd.connectorIds).toEqual(["c1"]);
	});
});
