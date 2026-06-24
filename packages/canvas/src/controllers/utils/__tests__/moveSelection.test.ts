import { beforeAll, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";
import { moveSelection } from "../moveSelection";

// moveByDelta は objectBehaviorRegistry 経由で解決されるため、レジストリを初期化する
beforeAll(() => {
	initializeObjectRegistry();
});

const makeRect = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width: 10,
		height: 10,
	}) as unknown as ObjectState;

const makeGroup = (
	id: string,
	cx: number,
	cy: number,
	childIds: string[],
): GroupState =>
	({
		id,
		type: "group",
		cx,
		cy,
		width: 100,
		height: 100,
		childIds,
	}) as unknown as GroupState;

describe("moveSelection", () => {
	it("非グループ図形を delta だけ平行移動する", () => {
		const srcObjects = { r1: makeRect("r1", 100, 100) };

		const { objects } = moveSelection({
			selectedIds: ["r1"],
			srcObjects,
			srcMultiSelectGroup: null,
			delta: { x: 10, y: -5 },
		});

		expect(objects.r1).toMatchObject({ cx: 110, cy: 95 });
	});

	it("srcObjects を変更せずクローンを返す", () => {
		const srcObjects = { r1: makeRect("r1", 0, 0) };

		const { objects } = moveSelection({
			selectedIds: ["r1"],
			srcObjects,
			srcMultiSelectGroup: null,
			delta: { x: 5, y: 5 },
		});

		expect(srcObjects.r1).toMatchObject({ cx: 0, cy: 0 });
		expect(objects).not.toBe(srcObjects);
	});

	it("選択外のオブジェクトはそのまま残す", () => {
		const srcObjects = {
			r1: makeRect("r1", 0, 0),
			r2: makeRect("r2", 50, 50),
		};

		const { objects } = moveSelection({
			selectedIds: ["r1"],
			srcObjects,
			srcMultiSelectGroup: null,
			delta: { x: 10, y: 10 },
		});

		expect(objects.r1).toMatchObject({ cx: 10, cy: 10 });
		expect(objects.r2).toBe(srcObjects.r2);
	});

	it("存在しない選択 ID は黙ってスキップする", () => {
		const srcObjects = { r1: makeRect("r1", 0, 0) };

		const { objects } = moveSelection({
			selectedIds: ["ghost", "r1"],
			srcObjects,
			srcMultiSelectGroup: null,
			delta: { x: 1, y: 1 },
		});

		expect(objects.ghost).toBeUndefined();
		expect(objects.r1).toMatchObject({ cx: 1, cy: 1 });
	});

	it("グループは子孫も再帰的に移動する", () => {
		const srcObjects = {
			g1: makeGroup("g1", 50, 50, ["r1"]),
			r1: makeRect("r1", 30, 30),
		};

		const { objects } = moveSelection({
			selectedIds: ["g1"],
			srcObjects,
			srcMultiSelectGroup: null,
			delta: { x: 20, y: 0 },
		});

		expect(objects.g1).toMatchObject({ cx: 70, cy: 50 });
		expect(objects.r1).toMatchObject({ cx: 50, cy: 30 });
	});

	it("multiSelectGroup の中心も delta だけ同期する", () => {
		const srcMultiSelectGroup = makeGroup("ms", 10, 20, ["r1"]);

		const { multiSelectGroup } = moveSelection({
			selectedIds: ["r1"],
			srcObjects: { r1: makeRect("r1", 0, 0) },
			srcMultiSelectGroup,
			delta: { x: 5, y: 7 },
		});

		expect(multiSelectGroup).toMatchObject({ cx: 15, cy: 27 });
		// 元の multiSelectGroup は変更しない
		expect(srcMultiSelectGroup).toMatchObject({ cx: 10, cy: 20 });
	});

	it("multiSelectGroup が null なら null を返す", () => {
		const { multiSelectGroup } = moveSelection({
			selectedIds: [],
			srcObjects: {},
			srcMultiSelectGroup: null,
			delta: { x: 1, y: 1 },
		});

		expect(multiSelectGroup).toBeNull();
	});
});
