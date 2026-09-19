import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../../../../CanvasTypes";
import { createTestRegistries } from "../../../../../../registries/createCanvasRegistries";
import type { CanvasEvent } from "../../../../../registry/GestureHandlerTypes";
import { handleRotationDrag } from "../handleRotationDrag";

const registries = createTestRegistries();

const VIEWPORT = { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 };

const makeRect = (
	id: string,
	cx: number,
	cy: number,
	width = 100,
	height = 50,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const makeGroup = (
	id: string,
	childIds: string[],
	cx: number,
	cy: number,
	width = 100,
	height = 50,
): GroupState =>
	({
		id,
		type: "group",
		childIds,
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as GroupState;

const makeState = (
	objects: Record<string, ObjectState>,
	selectedIds: string[],
	multiSelectGroup: GroupState | null = null,
): CanvasControllerState =>
	({
		registries,
		objects,
		rootIds: Object.keys(objects),
		selectedIds,
		multiSelectGroup,
		viewport: VIEWPORT,
		activeDrag: {
			startSnapshot: {
				objects,
				keyPoints: {},
				snapCandidates: { x: [], y: [] },
				selectedIds,
				selectedIdsWithDescendants: new Set(selectedIds),
				multiSelectGroup,
				viewport: VIEWPORT,
			},
			kind: "other",
		},
	}) as unknown as CanvasControllerState;

const makeDragEvent = (
	last: { x: number; y: number },
	{ shift = false }: { shift?: boolean } = {},
): CanvasEvent =>
	({
		type: "drag",
		targetKind: "control",
		targetId: "transform",
		targetPart: "rotation",
		button: 0,
		last,
		mods: { shift, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

/** Distance from the frame center to the cursor. Free, since only the angle counts */
const CURSOR_RADIUS = 150;

/**
 * Cursor position that turns the 100x50 frame centered at (50, 25) to an
 * absolute rotation of `degrees`: that many degrees off the rotation reference
 * vector (cx + width, cy - height).
 */
const cursorForRotation = (degrees: number): { x: number; y: number } => {
	const referenceRadian = Math.atan2(-50, 100);
	const targetRadian = referenceRadian + (degrees * Math.PI) / 180;
	return {
		x: 50 + CURSOR_RADIUS * Math.cos(targetRadian),
		y: 25 + CURSOR_RADIUS * Math.sin(targetRadian),
	};
};

/**
 * The rotation reference point of a 100x50 frame centered at (50, 25) is
 * toward (cx + width, cy - height) = (150, -25). Placing the cursor on that
 * reference vector rotated by θ yields rotation = θ.
 */
describe("handleRotationDrag", () => {
	describe("single selection (rect)", () => {
		it("cursor on the reference vector rotated by 90 degrees sets rotation to 90", () => {
			// Reference vector (100, -50) rotated +90 -> (50, 100), so cursor = (100, 125)
			const state = makeState({ "rect-1": makeRect("rect-1", 50, 25) }, [
				"rect-1",
			]);
			const next = handleRotationDrag(
				state,
				makeDragEvent({ x: 100, y: 125 }),
				registries,
			);
			expect(next.objects["rect-1"]).toMatchObject({ rotation: 90 });
		});

		it("rounds the rotation to an integer", () => {
			// Cursor at (150, 25): angle 0, reference angle atan2(-50, 100) = -26.565...deg -> rounds to 27
			const state = makeState({ "rect-1": makeRect("rect-1", 50, 25) }, [
				"rect-1",
			]);
			const next = handleRotationDrag(
				state,
				makeDragEvent({ x: 150, y: 25 }),
				registries,
			);
			expect(next.objects["rect-1"]).toMatchObject({ rotation: 27 });
		});

		it("normalizes negative angles into the 0-360 range", () => {
			// Reference vector (100, -50) rotated -90 -> (-50, -100), so cursor = (0, -75) -> 270
			const state = makeState({ "rect-1": makeRect("rect-1", 50, 25) }, [
				"rect-1",
			]);
			const next = handleRotationDrag(
				state,
				makeDragEvent({ x: 0, y: -75 }),
				registries,
			);
			expect(next.objects["rect-1"]).toMatchObject({ rotation: 270 });
		});

		it("keeps the center and size unchanged", () => {
			const state = makeState({ "rect-1": makeRect("rect-1", 50, 25) }, [
				"rect-1",
			]);
			const next = handleRotationDrag(
				state,
				makeDragEvent({ x: 100, y: 125 }),
				registries,
			);
			expect(next.objects["rect-1"]).toMatchObject({
				cx: 50,
				cy: 25,
				width: 100,
				height: 50,
			});
		});
	});

	describe("single selection (group)", () => {
		it("rotates the group and its children about the group center", () => {
			const child = makeRect("rect-a", 30, 25, 10, 10);
			const group = makeGroup("grp", ["rect-a"], 50, 25);
			const state = makeState({ grp: group, "rect-a": child }, ["grp"]);

			const next = handleRotationDrag(
				state,
				makeDragEvent({ x: 100, y: 125 }),
				registries,
			);

			expect(next.objects["grp"]).toMatchObject({ rotation: 90 });
			// Child center (30, 25) rotated +90 about (50, 25) -> (50, 5)
			const rotatedChild = next.objects["rect-a"] as unknown as {
				cx: number;
				cy: number;
				rotation: number;
			};
			expect(rotatedChild.rotation).toBe(90);
			expect(rotatedChild.cx).toBeCloseTo(50);
			expect(rotatedChild.cy).toBeCloseTo(5);
		});
	});

	describe("multi-selection", () => {
		it("rotates each selected object relative to the multiSelectGroup", () => {
			const rectA = makeRect("rect-a", 30, 25, 10, 10);
			const rectB = makeRect("rect-b", 70, 25, 10, 10);
			const multiSelectGroup = makeGroup(
				"multi-select-group",
				["rect-a", "rect-b"],
				50,
				25,
			);
			const state = makeState(
				{ "rect-a": rectA, "rect-b": rectB },
				["rect-a", "rect-b"],
				multiSelectGroup,
			);

			const next = handleRotationDrag(
				state,
				makeDragEvent({ x: 100, y: 125 }),
				registries,
			);

			expect(next.multiSelectGroup).toMatchObject({ rotation: 90 });
			// Centers rotate +90 about the group center (50, 25)
			const rotatedA = next.objects["rect-a"] as unknown as {
				cx: number;
				cy: number;
				rotation: number;
			};
			const rotatedB = next.objects["rect-b"] as unknown as {
				cx: number;
				cy: number;
				rotation: number;
			};
			expect(rotatedA.rotation).toBe(90);
			expect(rotatedA.cx).toBeCloseTo(50);
			expect(rotatedA.cy).toBeCloseTo(5);
			expect(rotatedB.rotation).toBe(90);
			expect(rotatedB.cx).toBeCloseTo(50);
			expect(rotatedB.cy).toBeCloseTo(45);
		});
	});

	describe("Shift snapping", () => {
		it.each([
			{ rawDegrees: 37, snapped: 30 },
			{ rawDegrees: 52, snapped: 45 },
			// 353 rounds up to 360, which normalizes back to 0
			{ rawDegrees: 353, snapped: 0 },
		])(
			"snaps $rawDegrees degrees to $snapped while Shift is held",
			({ rawDegrees, snapped }) => {
				const state = makeState({ "rect-1": makeRect("rect-1", 50, 25) }, [
					"rect-1",
				]);
				const next = handleRotationDrag(
					state,
					makeDragEvent(cursorForRotation(rawDegrees), { shift: true }),
					registries,
				);
				expect(next.objects["rect-1"]).toMatchObject({ rotation: snapped });
			},
		);

		it.each([37, 52, 353])(
			"keeps %i degrees as is without Shift",
			(rawDegrees) => {
				const state = makeState({ "rect-1": makeRect("rect-1", 50, 25) }, [
					"rect-1",
				]);
				const next = handleRotationDrag(
					state,
					makeDragEvent(cursorForRotation(rawDegrees)),
					registries,
				);
				expect(next.objects["rect-1"]).toMatchObject({ rotation: rawDegrees });
			},
		);

		it("snaps the multi-selection group the same way", () => {
			const rectA = makeRect("rect-a", 30, 25, 10, 10);
			const rectB = makeRect("rect-b", 70, 25, 10, 10);
			const multiSelectGroup = makeGroup(
				"multi-select-group",
				["rect-a", "rect-b"],
				50,
				25,
			);
			const state = makeState(
				{ "rect-a": rectA, "rect-b": rectB },
				["rect-a", "rect-b"],
				multiSelectGroup,
			);

			const next = handleRotationDrag(
				state,
				makeDragEvent(cursorForRotation(37), { shift: true }),
				registries,
			);

			expect(next.multiSelectGroup).toMatchObject({ rotation: 30 });
			expect(next.objects["rect-a"]).toMatchObject({ rotation: 30 });
		});

		it("snaps a selected group the same way", () => {
			const child = makeRect("rect-a", 30, 25, 10, 10);
			const group = makeGroup("grp", ["rect-a"], 50, 25);
			const state = makeState({ grp: group, "rect-a": child }, ["grp"]);

			const next = handleRotationDrag(
				state,
				makeDragEvent(cursorForRotation(52), { shift: true }),
				registries,
			);

			expect(next.objects["grp"]).toMatchObject({ rotation: 45 });
			expect(next.objects["rect-a"]).toMatchObject({ rotation: 45 });
		});
	});

	describe("guards", () => {
		it("returns the state as is when no drag is open", () => {
			const state = {
				objects: { "rect-1": makeRect("rect-1", 50, 25) },
				selectedIds: ["rect-1"],
				activeDrag: null,
			} as unknown as CanvasControllerState;
			expect(
				handleRotationDrag(
					state,
					makeDragEvent({ x: 100, y: 125 }),
					registries,
				),
			).toBe(state);
		});

		it("returns the state as is when the selected object is not a transformed frame", () => {
			const notFrame = { id: "text-1", type: "text" } as unknown as ObjectState;
			const state = makeState({ "text-1": notFrame }, ["text-1"]);
			expect(
				handleRotationDrag(
					state,
					makeDragEvent({ x: 100, y: 125 }),
					registries,
				),
			).toBe(state);
		});
	});
});
