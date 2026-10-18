import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@jiscribe/canvas";
import { calcFrameKeyPoint } from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { calcErEntityLayout } from "../../layout/calcErEntityLayout";
import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToState } from "../../state/ErEntityMapper";
import type { ErEntityState } from "../../state/ErEntityState";
import { handleErEntityTrailingEdge } from "../handleErEntityTrailingEdge";

/** 220 wide with its drawn top-left at (100, 80): key 24 (no keys, unstated), name 96, type 100. */
const makeEntity = (overrides: Partial<ErEntityDoc> = {}): ErEntityState =>
	erEntityToState({
		id: "e-1",
		type: "erEntity",
		x: 100,
		y: 80,
		nameWidth: 96,
		typeWidth: 100,
		name: "users",
		columns: [{ name: "id" }, { name: "email" }],
		...overrides,
	} as ErEntityDoc);

const makeContext = (
	entity: ErEntityState,
): SelectionControlContext<ErEntityState> => ({
	object: entity,
	startObject: entity,
	selectedPart: null,
});

const makeEvent = (
	worldDelta: Point,
	shift = false,
	type: "drag" | "dragEnd" = "drag",
): SelectionControlEvent => ({
	type,
	start: { x: 320, y: 120 },
	last: { x: 320 + worldDelta.x, y: 120 + worldDelta.y },
	delta: worldDelta,
	mods: { shift, alt: false, ctrl: false, meta: false },
});

/** The type column's width as the entity is drawn. */
const drawnTypeWidth = (entity: ErEntityState): number =>
	calcErEntityLayout(entity).typeWidth;

const drawnTopLeft = (entity: ErEntityState): Point => {
	const corner = calcFrameKeyPoint(entity, "topLeft");
	return { x: Number(corner.x.toFixed(3)), y: Number(corner.y.toFixed(3)) };
};

describe("handleErEntityTrailingEdge", () => {
	it("writes the type's px and widens the box from its drawn corner, the key gutter left unstated", () => {
		const entity = makeEntity();
		const result = handleErEntityTrailingEdge(
			makeContext(entity),
			makeEvent({ x: 30, y: 0 }),
		);
		const dragged = result?.object as ErEntityState;
		expect(dragged.typeWidth).toBe(130);
		expect(drawnTypeWidth(dragged)).toBe(130);
		expect(dragged.nameWidth).toBe(96);
		expect(dragged).not.toHaveProperty("keyWidth");
		expect(dragged.width).toBe(250);
		expect(drawnTopLeft(dragged)).toEqual(drawnTopLeft(entity));
	});

	it("ignores Shift", () => {
		const entity = makeEntity({ keyWidth: 40, nameWidth: 90, typeWidth: 90 });
		const plain = handleErEntityTrailingEdge(
			makeContext(entity),
			makeEvent({ x: 30, y: 0 }),
		);
		const shifted = handleErEntityTrailingEdge(
			makeContext(entity),
			makeEvent({ x: 30, y: 0 }, true),
		);
		expect(shifted).toEqual(plain);
		expect((shifted?.object as ErEntityState).width).toBe(250);
	});

	it("follows the cursor on a mirrored entity", () => {
		const entity: ErEntityState = { ...makeEntity(), scaleX: -1 };
		const result = handleErEntityTrailingEdge(
			makeContext(entity),
			makeEvent({ x: -30, y: 0 }),
		);
		expect(drawnTypeWidth(result?.object as ErEntityState)).toBe(130);
	});

	it("handles drags and drag ends only", () => {
		const entity = makeEntity();
		expect(
			handleErEntityTrailingEdge(
				makeContext(entity),
				makeEvent({ x: 30, y: 0 }, false, "dragEnd"),
			),
		).not.toBeNull();
		const click: SelectionControlEvent = {
			type: "click",
			last: { x: 320, y: 120 },
			mods: { shift: false, alt: false, ctrl: false, meta: false },
		};
		expect(handleErEntityTrailingEdge(makeContext(entity), click)).toBeNull();
	});
});
