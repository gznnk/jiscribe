import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type {
	CanvasControllerState,
	SnapCandidates,
	SnapEdge,
} from "../../../../CanvasTypes";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import { textSlotPartSelection } from "../../../../selection/__tests__/support/textSlotPartSelection";
import { readTextEditDraft } from "../../../../utils/readTextEditDraft";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { CanvasEventHandler } from "../CanvasEventHandler";

const registries = createTestRegistries();

const makeTextRect = (id: string, text: string): ObjectState =>
	({ id, type: "rect", text: { body: { text } } }) as unknown as ObjectState;

const makeState = (
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		objects: { a: makeTextRect("a", "old text") },
		rootIds: ["a"],
		selection: selectionOf(["a"], textSlotPartSelection("body")),
		multiSelectGroup: null,
		contextMenuPosition: null,
		objectMenuOpenId: null,
		mode: { kind: "textEdit", draft: { kind: "shape", text: "edited text" } },
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		commitVersion: 0,
		drag: null,
		...overrides,
	}) as unknown as CanvasControllerState;

const makeEvent = (overrides: Record<string, unknown>): CanvasEvent =>
	({
		targetKind: "canvas",
		targetId: "canvas",
		button: 0,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
		...overrides,
	}) as unknown as CanvasEvent;

describe("CanvasEventHandler", () => {
	describe("scroll / zoom while editing text", () => {
		it("scroll updates only the viewport without interrupting text editing", () => {
			const state = makeState();
			const event = makeEvent({
				type: "scroll",
				scrollDelta: { deltaX: 10, deltaY: 20 },
			});

			const nextState = CanvasEventHandler.handle(state, event, registries);

			expect(readTextEditDraft(nextState)).toEqual({
				kind: "shape",
				text: "edited text",
			});
			expect(nextState.viewport.minX).toBe(10);
			expect(nextState.viewport.minY).toBe(20);
		});

		it("scroll updates the viewport with a delta scaled by the zoom level", () => {
			const state = makeState({
				viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 2 },
			} as Partial<CanvasControllerState>);
			const event = makeEvent({
				type: "scroll",
				scrollDelta: { deltaX: 10, deltaY: 20 },
			});

			const nextState = CanvasEventHandler.handle(state, event, registries);

			expect(nextState.viewport.minX).toBe(5);
			expect(nextState.viewport.minY).toBe(10);
		});

		it("zoom updates only the zoom level without interrupting text editing", () => {
			const state = makeState();
			const event = makeEvent({
				type: "zoom",
				zoomScale: 1.1,
				last: { x: 0, y: 0 },
			});

			const nextState = CanvasEventHandler.handle(state, event, registries);

			expect(readTextEditDraft(nextState)).toEqual({
				kind: "shape",
				text: "edited text",
			});
			expect(nextState.viewport.zoom).toBeCloseTo(1.1);
		});
	});

	describe("click while editing text", () => {
		it("pressed commits the text and ends editing", () => {
			const state = makeState();
			const event = makeEvent({ type: "pressed", button: 0 });

			const nextState = CanvasEventHandler.handle(state, event, registries);

			expect(readTextEditDraft(nextState)).toBeNull();
			expect(
				(
					nextState.objects["a"] as ObjectState & {
						text: { body: { text: string } };
					}
				).text.body.text,
			).toBe("edited text");
			expect(nextState.selection.objectIds).toEqual([]);
		});
	});

	describe("touch: deselection and edit commit wait for the tap to resolve", () => {
		it("a touch press keeps the selection, menus, and the active edit", () => {
			const state = makeState({
				contextMenuPosition: { clientX: 10, clientY: 10 },
			} as Partial<CanvasControllerState>);
			const event = makeEvent({
				type: "pressed",
				button: 0,
				pointerType: "touch",
			});

			const nextState = CanvasEventHandler.handle(state, event, registries);

			expect(readTextEditDraft(nextState)).not.toBeNull();
			expect(nextState.selection.objectIds).toEqual(["a"]);
			expect(nextState.contextMenuPosition).toEqual({
				clientX: 10,
				clientY: 10,
			});
		});

		it("a touch pan drag pans while keeping the selection and the active edit", () => {
			const state = makeState();
			const event = makeEvent({
				type: "drag",
				button: 0,
				pointerType: "touch",
				clientDelta: { x: 100, y: 50 },
			});

			const nextState = CanvasEventHandler.handle(state, event, registries);

			expect(readTextEditDraft(nextState)).not.toBeNull();
			expect(nextState.selection.objectIds).toEqual(["a"]);
			expect(nextState.viewport.minX).toBeCloseTo(-100);
			expect(nextState.viewport.minY).toBeCloseTo(-50);
		});

		it("a touch tap (click) commits the edit and clears the selection", () => {
			const state = makeState();
			const event = makeEvent({
				type: "click",
				button: 0,
				pointerType: "touch",
			});

			const nextState = CanvasEventHandler.handle(state, event, registries);

			expect(readTextEditDraft(nextState)).toBeNull();
			expect(
				(
					nextState.objects["a"] as ObjectState & {
						text: { body: { text: string } };
					}
				).text.body.text,
			).toBe("edited text");
			expect(nextState.selection.objectIds).toEqual([]);
		});

		it("a mouse click after its press does not re-clear on click (unchanged mouse path)", () => {
			const state = makeState({
				mode: { kind: "normal" },
			} as Partial<CanvasControllerState>);
			const event = makeEvent({ type: "click", button: 0 });

			const nextState = CanvasEventHandler.handle(state, event, registries);

			// Mouse clears on pressed, not click; the selection here is untouched
			expect(nextState.selection.objectIds).toEqual(["a"]);
		});
	});

	describe("touch long press", () => {
		it("opens the context menu at the press position and commits the active edit", () => {
			const state = makeState();
			const event = makeEvent({
				type: "longPress",
				button: 0,
				pointerType: "touch",
				clientLast: { x: 320, y: 240 },
			});

			const nextState = CanvasEventHandler.handle(state, event, registries);

			expect(nextState.contextMenuPosition).toEqual({
				clientX: 320,
				clientY: 240,
			});
			expect(readTextEditDraft(nextState)).toBeNull();
			// Pressed on the background, so the selection stays — as it does for a
			// right click there (see "context menu selection" below).
			expect(nextState.selection.objectIds).toEqual(["a"]);
		});
	});

	describe("area selection (marquee)", () => {
		const bboxes = {
			a: { left: 10, right: 20, top: 10, bottom: 20 },
			b: { left: 30, right: 40, top: 30, bottom: 40 },
		};
		/** A marquee drag already under way, over the bboxes above. */
		const marqueeDrag = (marquee: {
			startX: number;
			startY: number;
			endX: number;
			endY: number;
			hitIds: string[];
			baseIds: string[];
		}) => {
			const { hitIds, baseIds, ...rect } = marquee;
			return {
				kind: "marquee",
				rect,
				hitIds,
				baseIds,
				startSnapshot: { bboxes },
				snapFeedback: null,
				axisLockFeedback: null,
				edgeScrollEnabled: true,
			} as unknown as CanvasControllerState["drag"];
		};
		/** The marquee a state carries, flattened; null during any other drag, or none. */
		const marqueeOf = (state: CanvasControllerState) =>
			state.drag?.kind === "marquee"
				? {
						...state.drag.rect,
						hitIds: state.drag.hitIds,
						baseIds: state.drag.baseIds,
					}
				: null;
		const makeMarqueeState = (
			overrides: Partial<CanvasControllerState> = {},
		): CanvasControllerState =>
			makeState({
				objects: {
					a: makeTextRect("a", ""),
					b: makeTextRect("b", ""),
				},
				rootIds: ["a", "b"],
				selection: selectionOf([]),
				mode: { kind: "normal" },
				drag: {
					kind: "inert",
					startSnapshot: { bboxes },
					snapFeedback: null,
					axisLockFeedback: null,
					edgeScrollEnabled: false,
				},
				...overrides,
			} as Partial<CanvasControllerState>);

		it("dragStart initializes hitIds to empty and clears multiSelectGroup", () => {
			const state = makeMarqueeState({
				multiSelectGroup: { id: "stale" },
			} as Partial<CanvasControllerState>);
			const nextState = CanvasEventHandler.handle(
				state,
				makeEvent({
					type: "dragStart",
					start: { x: 0, y: 0 },
					last: { x: 0, y: 0 },
				}),
				registries,
			);
			expect(marqueeOf(nextState)).toEqual({
				startX: 0,
				startY: 0,
				endX: 0,
				endY: 0,
				hitIds: [],
				baseIds: [],
			});
			expect(nextState.multiSelectGroup).toBeNull();
		});

		it("a changed hit set recomputes the selection and stores the new hitIds", () => {
			const state = makeMarqueeState({
				drag: marqueeDrag({
					startX: 0,
					startY: 0,
					endX: 5,
					endY: 5,
					hitIds: [],
					baseIds: [],
				}),
			} as Partial<CanvasControllerState>);
			const nextState = CanvasEventHandler.handle(
				state,
				makeEvent({ type: "drag", last: { x: 50, y: 50 } }),
				registries,
			);
			expect(nextState.selection.objectIds).toEqual(["a", "b"]);
			expect(nextState.multiSelectGroup).not.toBeNull();
			expect(marqueeOf(nextState)?.hitIds).toEqual(["a", "b"]);
		});

		it("an additive dragStart keeps the selection and records it as baseIds", () => {
			const state = makeMarqueeState({
				selection: selectionOf(["b"]),
				multiSelectGroup: { id: "kept" },
			} as Partial<CanvasControllerState>);
			const nextState = CanvasEventHandler.handle(
				state,
				makeEvent({
					type: "dragStart",
					start: { x: 0, y: 0 },
					last: { x: 0, y: 0 },
					mods: { shift: true, alt: false, ctrl: false, meta: false },
				}),
				registries,
			);
			expect(marqueeOf(nextState)?.baseIds).toEqual(["b"]);
			expect(nextState.selection.objectIds).toEqual(["b"]);
			expect(nextState.multiSelectGroup).toEqual({ id: "kept" });
		});

		it("an additive drag selects the base plus the newly enclosed ids", () => {
			const state = makeMarqueeState({
				selection: selectionOf(["b"]),
				drag: marqueeDrag({
					startX: 0,
					startY: 0,
					endX: 0,
					endY: 0,
					hitIds: [],
					baseIds: ["b"],
				}),
			} as Partial<CanvasControllerState>);
			// The marquee (0,0)-(25,25) encloses a alone; b comes from the base.
			const nextState = CanvasEventHandler.handle(
				state,
				makeEvent({ type: "drag", last: { x: 25, y: 25 } }),
				registries,
			);
			expect(nextState.selection.objectIds).toEqual(["b", "a"]);
			expect(marqueeOf(nextState)?.hitIds).toEqual(["a"]);
			expect(nextState.multiSelectGroup).not.toBeNull();
		});

		it("an additive drag falls back to the base when the hit set empties", () => {
			const state = makeMarqueeState({
				selection: selectionOf(["b", "a"]),
				drag: marqueeDrag({
					startX: 0,
					startY: 0,
					endX: 25,
					endY: 25,
					hitIds: ["a"],
					baseIds: ["b"],
				}),
			} as Partial<CanvasControllerState>);
			const nextState = CanvasEventHandler.handle(
				state,
				makeEvent({ type: "drag", last: { x: 5, y: 5 } }),
				registries,
			);
			expect(nextState.selection.objectIds).toEqual(["b"]);
			expect(marqueeOf(nextState)?.hitIds).toEqual([]);
			expect(nextState.multiSelectGroup).toBeNull();
		});

		it("an identical hit set early-outs, keeping the selection / multiSelectGroup by reference", () => {
			const state = makeMarqueeState({
				drag: marqueeDrag({
					startX: 0,
					startY: 0,
					endX: 5,
					endY: 5,
					hitIds: [],
					baseIds: [],
				}),
			} as Partial<CanvasControllerState>);
			const firstFrame = CanvasEventHandler.handle(
				state,
				makeEvent({ type: "drag", last: { x: 50, y: 50 } }),
				registries,
			);
			const secondFrame = CanvasEventHandler.handle(
				firstFrame,
				makeEvent({ type: "drag", last: { x: 55, y: 55 } }),
				registries,
			);
			expect(secondFrame.selection.objectIds).toBe(
				firstFrame.selection.objectIds,
			);
			expect(secondFrame.multiSelectGroup).toBe(firstFrame.multiSelectGroup);
			expect(marqueeOf(secondFrame)?.hitIds).toBe(
				marqueeOf(firstFrame)?.hitIds,
			);
			expect(marqueeOf(secondFrame)?.endX).toBe(55);
			expect(marqueeOf(secondFrame)?.endY).toBe(55);
		});
	});

	describe("draw mode: Shift axis lock", () => {
		const makeDrawState = (
			objectType: string,
			snapCandidates: SnapCandidates | null = null,
		): CanvasControllerState =>
			makeState({
				mode: { kind: "draw", preset: { objectType } },
				drag: {
					kind: "draw",
					rect: { startX: 100, startY: 100, endX: 100, endY: 100 },
					startSnapshot: { snapCandidates },
					snapFeedback: null,
					axisLockFeedback: null,
					edgeScrollEnabled: true,
				},
			} as unknown as Partial<CanvasControllerState>);

		const makeDrawDrag = (last: { x: number; y: number }, shift: boolean) =>
			makeEvent({
				type: "drag",
				last,
				mods: { shift, alt: false, ctrl: false, meta: false },
			});

		const previewEnd = (state: CanvasControllerState) => {
			const rect = state.drag?.kind === "draw" ? state.drag.rect : null;
			return { x: rect?.endX, y: rect?.endY };
		};

		it("a horizontal-dominant polyline drag locks Y to the start point", () => {
			const nextState = CanvasEventHandler.handle(
				makeDrawState("polyline"),
				makeDrawDrag({ x: 180, y: 130 }, true),
				registries,
			);
			expect(previewEnd(nextState)).toEqual({ x: 180, y: 100 });
			expect(nextState.drag?.axisLockFeedback).toEqual({ y: 100 });
		});

		it("a vertical-dominant polyline drag locks X to the start point", () => {
			const nextState = CanvasEventHandler.handle(
				makeDrawState("polyline"),
				makeDrawDrag({ x: 120, y: 20 }, true),
				registries,
			);
			expect(previewEnd(nextState)).toEqual({ x: 100, y: 20 });
			expect(nextState.drag?.axisLockFeedback).toEqual({ x: 100 });
		});

		it("a tiny free-axis move does not snap back to the start point", () => {
			const nextState = CanvasEventHandler.handle(
				makeDrawState("polyline"),
				makeDrawDrag({ x: 103, y: 101 }, true),
				registries,
			);
			expect(previewEnd(nextState)).toEqual({ x: 103, y: 100 });
			expect(nextState.drag?.axisLockFeedback).toEqual({ y: 100 });
		});

		it("without Shift, a polyline drag stays diagonal", () => {
			const nextState = CanvasEventHandler.handle(
				makeDrawState("polyline"),
				makeDrawDrag({ x: 180, y: 130 }, false),
				registries,
			);
			expect(previewEnd(nextState)).toEqual({ x: 180, y: 130 });
			expect(nextState.drag?.axisLockFeedback).toBeNull();
		});

		it("Shift does not constrain a rect drag", () => {
			const nextState = CanvasEventHandler.handle(
				makeDrawState("rect"),
				makeDrawDrag({ x: 180, y: 130 }, true),
				registries,
			);
			expect(previewEnd(nextState)).toEqual({ x: 180, y: 130 });
			expect(nextState.drag?.axisLockFeedback).toBeNull();
		});

		it("alignment snap applies only on the free axis", () => {
			const candidate = (coordinate: number, edge: SnapEdge) => ({
				objectId: "b",
				coordinate,
				edge,
				perpendicularMin: 0,
				perpendicularMax: 200,
			});
			// Both candidates are within the snap threshold of the raw cursor
			const snapCandidates: SnapCandidates = {
				x: [candidate(182, "left")],
				y: [candidate(132, "top")],
			};
			const nextState = CanvasEventHandler.handle(
				makeDrawState("polyline", snapCandidates),
				makeDrawDrag({ x: 180, y: 130 }, true),
				registries,
			);
			expect(previewEnd(nextState)).toEqual({ x: 182, y: 100 });
			expect(nextState.drag?.snapFeedback?.x).toHaveLength(1);
			expect(nextState.drag?.snapFeedback?.y).toHaveLength(0);
		});
	});

	describe("draw mode: dragEnd", () => {
		const makeDrawEndState = (preview: {
			startX: number;
			startY: number;
			endX: number;
			endY: number;
		}): CanvasControllerState =>
			makeState({
				mode: { kind: "draw", preset: { objectType: "rect" } },
				drag: {
					kind: "draw",
					rect: preview,
					startSnapshot: { snapCandidates: null },
					snapFeedback: null,
					axisLockFeedback: null,
					edgeScrollEnabled: true,
				},
			} as unknown as Partial<CanvasControllerState>);

		const drawEnd = makeEvent({ type: "dragEnd", last: { x: 0, y: 0 } });

		it("commits the shape it places once", () => {
			const state = makeDrawEndState({
				startX: 100,
				startY: 100,
				endX: 180,
				endY: 160,
			});
			const nextState = CanvasEventHandler.handle(state, drawEnd, registries);
			expect(nextState.rootIds).toHaveLength(state.rootIds.length + 1);
			expect(nextState.commitVersion).toBe(state.commitVersion + 1);
		});

		it("commits nothing for a drawing abandoned below the minimum size", () => {
			const state = makeDrawEndState({
				startX: 100,
				startY: 100,
				endX: 101,
				endY: 101,
			});
			const nextState = CanvasEventHandler.handle(state, drawEnd, registries);
			expect(nextState.objects).toBe(state.objects);
			expect(nextState.rootIds).toBe(state.rootIds);
			expect(nextState.mode.kind).toBe("normal");
			expect(nextState.commitVersion).toBe(state.commitVersion);
		});
	});

	it("a press with an additive modifier keeps the selection but still closes menus", () => {
		const state = makeState({
			mode: { kind: "normal" },
			multiSelectGroup: { id: "kept" },
			contextMenuPosition: { clientX: 10, clientY: 10 },
			objectMenuOpenId: "a",
			stencilLibraryOpenCategory: "flowchart",
		} as Partial<CanvasControllerState>);
		const nextState = CanvasEventHandler.handle(
			state,
			makeEvent({
				type: "pressed",
				button: 0,
				mods: { shift: true, alt: false, ctrl: false, meta: false },
			}),
			registries,
		);
		expect(nextState.selection.objectIds).toEqual(["a"]);
		expect(nextState.multiSelectGroup).toEqual({ id: "kept" });
		expect(nextState.contextMenuPosition).toBeNull();
		expect(nextState.objectMenuOpenId).toBeNull();
		expect(nextState.stencilLibraryOpenCategory).toBeNull();
	});

	// A context-menu gesture selects what it landed on, so the menu acts on the
	// pointed-at shape instead of on whatever was selected before. A target the
	// selection already covers (itself or a selected ancestor group) keeps it;
	// otherwise the decision comes from determineClickSelection, the same function
	// the left click uses.
	describe("context menu selection (right click / long press)", () => {
		const makeTwoRectState = (
			overrides: Partial<CanvasControllerState> = {},
		): CanvasControllerState =>
			makeState({
				objects: { a: makeTextRect("a", ""), b: makeTextRect("b", "") },
				rootIds: ["a", "b"],
				selection: selectionOf(["b"]),
				mode: { kind: "normal" },
				...overrides,
			} as Partial<CanvasControllerState>);

		const makeRightClickEvent = (
			overrides: Record<string, unknown> = {},
		): CanvasEvent =>
			makeEvent({
				type: "click",
				button: 2,
				targetKind: "object",
				targetId: "a",
				clientLast: { x: 120, y: 80 },
				...overrides,
			});

		it("selects an unselected shape and opens the menu", () => {
			const nextState = CanvasEventHandler.handle(
				makeTwoRectState(),
				makeRightClickEvent(),
				registries,
			);

			expect(nextState.selection.objectIds).toEqual(["a"]);
			expect(nextState.contextMenuPosition).toEqual({
				clientX: 120,
				clientY: 80,
			});
		});

		it("keeps a multi-selection that already contains the shape", () => {
			const state = makeTwoRectState({
				selection: selectionOf(["a", "b"]),
				multiSelectGroup: { id: "multi" },
			} as Partial<CanvasControllerState>);

			const nextState = CanvasEventHandler.handle(
				state,
				makeRightClickEvent(),
				registries,
			);

			// By reference: determineClickSelection reports no change, so nothing
			// rebuilds the selection or its multiSelectGroup.
			expect(nextState.selection.objectIds).toBe(state.selection.objectIds);
			expect(nextState.multiSelectGroup).toBe(state.multiSelectGroup);
			expect(nextState.contextMenuPosition).not.toBeNull();
		});

		it("keeps the selection when the background is right-clicked", () => {
			const state = makeTwoRectState();

			const nextState = CanvasEventHandler.handle(
				state,
				makeRightClickEvent({ targetKind: "canvas", targetId: "canvas" }),
				registries,
			);

			expect(nextState.selection.objectIds).toBe(state.selection.objectIds);
			expect(nextState.contextMenuPosition).not.toBeNull();
		});

		it("selects the group when one of its children is right-clicked", () => {
			const child = makeTextRect("child", "");
			const state = makeTwoRectState({
				objects: {
					group: {
						id: "group",
						type: "group",
						childIds: ["child", "sibling"],
					},
					child: { ...child, parentId: "group" },
					sibling: { ...makeTextRect("sibling", ""), parentId: "group" },
				},
				rootIds: ["group"],
				selection: selectionOf([]),
			} as unknown as Partial<CanvasControllerState>);

			const nextState = CanvasEventHandler.handle(
				state,
				makeRightClickEvent({ targetId: "child" }),
				registries,
			);

			expect(nextState.selection.objectIds).toEqual(["group"]);
		});

		const makeGroupState = (selectedIds: string[]): CanvasControllerState =>
			makeTwoRectState({
				objects: {
					group: {
						id: "group",
						type: "group",
						childIds: ["child", "sibling"],
					},
					child: { ...makeTextRect("child", ""), parentId: "group" },
					sibling: { ...makeTextRect("sibling", ""), parentId: "group" },
					b: makeTextRect("b", ""),
				},
				rootIds: ["group", "b"],
				selection: selectionOf(selectedIds),
			} as unknown as Partial<CanvasControllerState>);

		it("keeps a selected group when one of its children is right-clicked", () => {
			const state = makeGroupState(["group"]);

			const nextState = CanvasEventHandler.handle(
				state,
				makeRightClickEvent({ targetId: "child" }),
				registries,
			);

			expect(nextState.selection.objectIds).toBe(state.selection.objectIds);
			expect(nextState.contextMenuPosition).not.toBeNull();
		});

		it("keeps a multi-selection when a child of a selected group in it is right-clicked", () => {
			const state = makeGroupState(["group", "b"]);

			const nextState = CanvasEventHandler.handle(
				state,
				makeRightClickEvent({ targetId: "child" }),
				registries,
			);

			expect(nextState.selection.objectIds).toBe(state.selection.objectIds);
			expect(nextState.contextMenuPosition).not.toBeNull();
		});

		it("selects the group when its child is right-clicked while another shape is selected", () => {
			const nextState = CanvasEventHandler.handle(
				makeGroupState(["b"]),
				makeRightClickEvent({ targetId: "child" }),
				registries,
			);

			expect(nextState.selection.objectIds).toEqual(["group"]);
		});

		it("replaces the selection even with an additive modifier held", () => {
			const nextState = CanvasEventHandler.handle(
				makeTwoRectState(),
				makeRightClickEvent({
					mods: { shift: false, alt: false, ctrl: true, meta: false },
				}),
				registries,
			);

			expect(nextState.selection.objectIds).toEqual(["a"]);
		});

		it("selects a connector, clearing the shape selection", () => {
			const state = makeTwoRectState({
				objects: {
					a: makeTextRect("a", ""),
					line: { id: "line", type: "connector" },
				},
				rootIds: ["a", "line"],
				selection: selectionOf(["a"]),
			} as unknown as Partial<CanvasControllerState>);

			const nextState = CanvasEventHandler.handle(
				state,
				makeRightClickEvent({ targetKind: "connector", targetId: "line" }),
				registries,
			);

			expect(nextState.selection.objectIds).toEqual(["line"]);
		});

		it("selects an unselected shape on a touch long press too", () => {
			const nextState = CanvasEventHandler.handle(
				makeTwoRectState(),
				makeRightClickEvent({
					type: "longPress",
					button: 0,
					pointerType: "touch",
				}),
				registries,
			);

			expect(nextState.selection.objectIds).toEqual(["a"]);
			expect(nextState.contextMenuPosition).toEqual({
				clientX: 120,
				clientY: 80,
			});
		});
	});

	it("a background press closes an open StencilLibrary category flyout", () => {
		const state = makeState({
			mode: { kind: "normal" },
			stencilLibraryOpenCategory: "flowchart",
		} as Partial<CanvasControllerState>);
		const nextState = CanvasEventHandler.handle(
			state,
			makeEvent({ type: "pressed", button: 0 }),
			registries,
		);
		expect(nextState.stencilLibraryOpenCategory).toBeNull();
	});

	it("a background press closes the Other shapes popover", () => {
		const state = makeState({
			mode: { kind: "normal" },
			isOtherShapesPopoverOpen: true,
		} as Partial<CanvasControllerState>);
		const nextState = CanvasEventHandler.handle(
			state,
			makeEvent({ type: "pressed", button: 0 }),
			registries,
		);
		expect(nextState.isOtherShapesPopoverOpen).toBe(false);
	});
});
