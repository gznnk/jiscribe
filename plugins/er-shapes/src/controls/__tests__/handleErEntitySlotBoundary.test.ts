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
import { handleErEntitySlotBoundary } from "../handleErEntitySlotBoundary";

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
	subAction: string | undefined,
	worldDelta: Point,
	shift = false,
): SelectionControlEvent => ({
	type: "drag",
	start: { x: 200, y: 120 },
	last: { x: 200 + worldDelta.x, y: 120 + worldDelta.y },
	delta: worldDelta,
	mods: { shift, alt: false, ctrl: false, meta: false },
	subAction,
});

/** The type column's width as the entity is drawn. */
const drawnTypeWidth = (entity: ErEntityState): number =>
	calcErEntityLayout(entity).typeWidth;

const drawnTopLeft = (entity: ErEntityState): Point => {
	const corner = calcFrameKeyPoint(entity, "topLeft");
	return { x: Number(corner.x.toFixed(3)), y: Number(corner.y.toFixed(3)) };
};

describe("handleErEntitySlotBoundary", () => {
	it("states the key gutter it moves, and widens the box from its drawn corner", () => {
		const entity = makeEntity();
		const result = handleErEntitySlotBoundary(
			makeContext(entity),
			makeEvent("0", { x: 20, y: 0 }),
		);
		const dragged = result?.object as ErEntityState;
		expect(dragged.keyWidth).toBe(44);
		expect(dragged.derivedWidth).toBe(240);
		expect(dragged.nameWidth).toBe(96);
		expect(drawnTypeWidth(dragged)).toBe(100);
		expect(dragged.width).toBe(240);
		expect(drawnTopLeft(dragged)).toEqual(drawnTopLeft(entity));
	});

	it("leaves an unstated key gutter unstated when the cursor comes back to the start", () => {
		const result = handleErEntitySlotBoundary(
			makeContext(makeEntity()),
			makeEvent("0", { x: 0, y: 0 }),
		);
		expect(result?.object).not.toHaveProperty("keyWidth");
	});

	it("writes the name's px on the name / type boundary, the key gutter left unstated", () => {
		const result = handleErEntitySlotBoundary(
			makeContext(makeEntity()),
			makeEvent("1", { x: 20, y: 0 }),
		);
		const dragged = result?.object as ErEntityState;
		expect(dragged.nameWidth).toBe(116);
		expect(dragged.typeWidth).toBe(100);
		expect(dragged).not.toHaveProperty("keyWidth");
		expect(dragged.width).toBe(240);
	});

	it("keeps the box with Shift held", () => {
		const entity = makeEntity({ keyWidth: 40, nameWidth: 90, typeWidth: 90 });
		const result = handleErEntitySlotBoundary(
			makeContext(entity),
			makeEvent("1", { x: 30, y: 0 }, true),
		);
		const dragged = result?.object as ErEntityState;
		expect(drawnTypeWidth(dragged)).toBe(60);
		expect(dragged.nameWidth).toBe(120);
		expect(dragged.keyWidth).toBe(40);
		expect(dragged.width).toBe(220);
		expect(dragged.cx).toBe(entity.cx);
	});

	it("follows the cursor on a mirrored entity", () => {
		const entity: ErEntityState = { ...makeEntity(), scaleX: -1 };
		const result = handleErEntitySlotBoundary(
			makeContext(entity),
			makeEvent("1", { x: -30, y: 0 }),
		);
		expect((result?.object as ErEntityState).width).toBe(250);
	});

	it("ignores a strip naming no boundary", () => {
		expect(
			handleErEntitySlotBoundary(
				makeContext(makeEntity()),
				makeEvent("2", { x: 20, y: 0 }),
			),
		).toBeNull();
	});
});
