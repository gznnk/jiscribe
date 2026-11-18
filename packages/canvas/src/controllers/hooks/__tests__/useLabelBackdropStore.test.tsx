// @vitest-environment jsdom

import { advanceTextMeasurementGeneration } from "@jiscribe/doc/text/measure/textMeasurementSlot";
import type { Rect } from "@jiscribe/geometry";
import { act, memo } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MovePreview } from "../../../rendering/layers/content/MovePreview";
import type { LabelBackdropLayer } from "../../../rendering/objects/LabelBackdropStoreContext";
import {
	LabelBackdropStoreContext,
	NO_LABEL_BACKDROP_LAYERS,
} from "../../../rendering/objects/LabelBackdropStoreContext";
import { useLabelBackdropLayers } from "../../../rendering/objects/useLabelBackdropLayers";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type {
	CanvasControllerState,
	CanvasDragDetail,
} from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { createTextSlotPartKindDefinition } from "../../selection/partKinds/textSlotPartKind";
import { buildIdsWithAncestors } from "../../utils/buildIdsWithAncestors";
import { createCowObjects } from "../../utils/cowObjects";
import type * as ResolveLabelBackdropsModule from "../../utils/resolveLabelBackdrops";
import type { SnapshotRenderScope } from "../../utils/SnapshotRenderScope";
import { useLabelBackdropStore } from "../useLabelBackdropStore";

/** How often the pass ran, every call passed through. */
const passCalls = vi.hoisted(() => ({ count: 0 }));

vi.mock("../../utils/resolveLabelBackdrops", async (importOriginal) => {
	const actual = await importOriginal<typeof ResolveLabelBackdropsModule>();
	return {
		...actual,
		resolveLabelBackdropPass: (
			...args: Parameters<typeof actual.resolveLabelBackdropPass>
		) => {
			passCalls.count += 1;
			return actual.resolveLabelBackdropPass(...args);
		},
	};
});

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** How wide one character measures, which a face landing changes. */
const glyphWidth = { value: 10 };

/** A probe caption's box in its shape's local space: as wide as the text has characters × glyphWidth, 20 tall, under the box. */
const captionRegion = (state: ObjectState): Rect => {
	const text = (state as ObjectState & { text: { body: { text: string } } })
		.text.body.text;
	return { x: -20, y: 25, width: text.length * glyphWidth.value, height: 20 };
};

const registries = createTestRegistries();
registries.objectLabelBackdrop.register("frame", (state, style) => {
	const { width, height } = state as ObjectState & {
		width: number;
		height: number;
	};
	return [
		{
			rect: { x: -width / 2, y: -height / 2, width, height },
			fill: style.fillColor,
			fillOpacity: style.fillAlpha,
		},
	];
});
registries.objectPartKind.register("captioned", [
	createTextSlotPartKindDefinition({ region: captionRegion }),
]);

/** A 200 × 200 frame centered on (cx, 100). */
const frame = (id: string, cx: number, fillOpacity = 0.5): ObjectState =>
	({
		id,
		type: "frame",
		cx,
		cy: 100,
		width: 200,
		height: 200,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		fill: "#ff0000",
		fillOpacity,
	}) as unknown as ObjectState;

/** A captioned shape whose caption's box starts at x cx-20, y 105. */
const captioned = (id: string, cx: number, text = "Hi"): ObjectState =>
	({
		id,
		type: "captioned",
		features: { type: "captioned", geometry: "rect", text: "label" },
		cx,
		cy: 80,
		width: 40,
		height: 40,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		text: { body: { text } },
	}) as unknown as ObjectState;

type HostProps = {
	objects: Record<string, ObjectState>;
	rootIds: string[];
	snapshotRenderScope?: SnapshotRenderScope | null;
	fontsNonce?: number;
	/** The labels mounted under the store, each reading its own layers. */
	probeIds: string[];
	/** What is selected; nothing when not given. */
	selection?: CanvasControllerState["selection"];
	/** The editing session; a connector label's editor is open while it is a `connectorLabel` text edit. */
	mode?: CanvasControllerState["mode"];
	/** The drag under way. */
	drag?: Pick<CanvasDragDetail, "kind"> | null;
	/** What a move drag translated this frame; given for a move drag alone. */
	movePreview?: MovePreview;
	/** The ids in the viewport; empty when not given (read only while a drag runs). */
	visibleIds?: ReadonlySet<string>;
};

const NO_SELECTION: CanvasControllerState["selection"] = {
	objectIds: [],
	part: null,
};
const NORMAL_MODE: CanvasControllerState["mode"] = { kind: "normal" };
const NO_VISIBLE_IDS: ReadonlySet<string> = new Set();

/** What each probe answered, every render recorded in order. */
const probeRenders = new Map<string, Array<readonly LabelBackdropLayer[]>>();

const ProbeComponent = ({ ownerId }: { ownerId: string }) => {
	const layers = useLabelBackdropLayers(ownerId);
	const renders = probeRenders.get(ownerId) ?? [];
	renders.push(layers);
	probeRenders.set(ownerId, renders);
	return null;
};
const Probe = memo(ProbeComponent);

const Host = ({
	objects,
	rootIds,
	snapshotRenderScope = null,
	selection = NO_SELECTION,
	mode = NORMAL_MODE,
	drag = null,
	movePreview,
	visibleIds = NO_VISIBLE_IDS,
	fontsNonce = 0,
	probeIds,
}: HostProps) => {
	const store = useLabelBackdropStore({
		objects,
		selection,
		mode,
		rootIds,
		fontsNonce,
		snapshotRenderScope,
		drag,
		movePreview,
		visibleIds,
		registries,
	});
	return (
		<LabelBackdropStoreContext value={store}>
			{probeIds.map((id) => (
				<Probe key={id} ownerId={id} />
			))}
		</LabelBackdropStoreContext>
	);
};

let unmount: (() => void) | null = null;

beforeEach(() => {
	passCalls.count = 0;
});

afterEach(() => {
	unmount?.();
	unmount = null;
	probeRenders.clear();
	glyphWidth.value = 10;
});

const mountHost = () => {
	const root = createRoot(document.createElement("div"));
	unmount = () => act(() => root.unmount());
	return (props: HostProps): void => {
		act(() => root.render(<Host {...props} />));
	};
};

const toObjects = (...objects: ObjectState[]): Record<string, ObjectState> =>
	Object.fromEntries(objects.map((obj) => [obj.id, obj]));

/**
 * One frame of a drag over `base`: the copy-on-write view a drag handler hands
 * the reducer (createCowObjects), with `moved` written over it.
 */
const dragFrame = (
	base: Record<string, ObjectState>,
	...moved: ObjectState[]
): Record<string, ObjectState> => {
	const view = createCowObjects(base);
	for (const obj of moved) {
		view[obj.id] = obj;
	}
	return view;
};

/**
 * A labelled connector between two rects, on the frame, and the frames of a
 * move of both rects: the connector is shifted with them (MovePreview), so its
 * label's center is taken from the drag.
 */
const connectorMove = () => {
	const rect = (id: string, cx: number) =>
		({
			id,
			type: "rect",
			cx,
			cy: 100,
			width: 20,
			height: 20,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		}) as unknown as ObjectState;
	const connector = {
		id: "connector",
		type: "connector",
		points: [],
		routing: "straight",
		source: { owner: { id: "a" }, anchor: { kind: "center" } },
		target: { owner: { id: "b" }, anchor: { kind: "center" } },
		label: { text: "go" },
	} as unknown as ObjectState;
	const startObjects = toObjects(
		frame("frame", 100),
		rect("a", 40),
		rect("b", 140),
		connector,
	);
	const rootIds = ["frame", "a", "b", "connector"];
	const moveFrame = (dx: number) => ({
		objects: dragFrame(startObjects, rect("a", 40 + dx), rect("b", 140 + dx)),
		drag: { kind: "move" } as const,
		movePreview: {
			delta: { x: dx, y: 0 },
			translatedIds: new Set(["a", "b"]),
			startObjects,
		},
		visibleIds: new Set(rootIds),
	});
	return { startObjects, rootIds, moveFrame };
};

/**
 * A connector across the frame, selected, with no label yet, and the session
 * of a label being created on it at its middle with `text` typed: every
 * keystroke a new `mode`, as the reducer hands it on.
 */
const connectorLabelEdit = () => {
	const objects = toObjects(frame("frame", 100), {
		id: "connector",
		type: "connector",
		points: [],
		routing: "straight",
		source: { anchor: { kind: "free", point: { x: 0, y: 100 } } },
		target: { anchor: { kind: "free", point: { x: 200, y: 100 } } },
	} as unknown as ObjectState);
	const placement = { position: 0.5, offset: 0 };
	const typing = (text: string): CanvasControllerState["mode"] => ({
		kind: "textEdit",
		draft: { kind: "connectorLabel", text, placement },
	});
	return {
		objects,
		rootIds: ["frame", "connector"],
		selection: { objectIds: ["connector"], part: null },
		typing,
	};
};

/** The layers a probe last rendered with. */
const latestLayers = (ownerId: string): readonly LabelBackdropLayer[] =>
	probeRenders.get(ownerId)!.at(-1)!;

const ROOT_IDS = ["frame", "shape"];

describe("useLabelBackdropStore", () => {
	it("gives a label its layers from the first render", () => {
		const render = mountHost();
		render({
			objects: toObjects(frame("frame", 100), captioned("shape", 100)),
			rootIds: ROOT_IDS,
			probeIds: ["shape"],
		});
		expect(probeRenders.get("shape")).toHaveLength(1);
		expect(latestLayers("shape")).toEqual([
			{ fill: "#ff0000", fillOpacity: 0.5 },
		]);
	});

	it("follows a captioned shape dragged across a frame's border, frame by frame", () => {
		// The frame spans x 0..200; the caption's center sits at cx - 10.
		const base = toObjects(frame("frame", 100), captioned("shape", 180));
		const render = mountHost();
		render({ objects: base, rootIds: ROOT_IDS, probeIds: ["shape"] });
		expect(latestLayers("shape")).toHaveLength(1);

		render({
			objects: dragFrame(base, captioned("shape", 230)),
			rootIds: ROOT_IDS,
			probeIds: ["shape"],
		});
		expect(latestLayers("shape")).toBe(NO_LABEL_BACKDROP_LAYERS);

		render({
			objects: dragFrame(base, captioned("shape", 200)),
			rootIds: ROOT_IDS,
			probeIds: ["shape"],
		});
		expect(latestLayers("shape")).toHaveLength(1);
	});

	it("follows a frame dragged away and resized back under a label, frame by frame", () => {
		const base = toObjects(frame("frame", 100), captioned("shape", 100));
		const render = mountHost();
		render({ objects: base, rootIds: ROOT_IDS, probeIds: ["shape"] });
		expect(latestLayers("shape")).toHaveLength(1);

		// Moved to span x 400..600: the caption's center (90) is left behind.
		render({
			objects: dragFrame(base, frame("frame", 500)),
			rootIds: ROOT_IDS,
			probeIds: ["shape"],
		});
		expect(latestLayers("shape")).toBe(NO_LABEL_BACKDROP_LAYERS);

		// Its left edge pulled out to x 0 again by a resize.
		render({
			objects: dragFrame(base, {
				...frame("frame", 300),
				width: 600,
			} as ObjectState),
			rootIds: ROOT_IDS,
			probeIds: ["shape"],
		});
		expect(latestLayers("shape")).toHaveLength(1);
	});

	it("follows a frame's opacity a menu slider's drag changes, frame by frame", () => {
		const base = toObjects(frame("frame", 100), captioned("shape", 100));
		const render = mountHost();
		render({ objects: base, rootIds: ROOT_IDS, probeIds: ["shape"] });
		render({
			objects: dragFrame(base, frame("frame", 100, 0.9)),
			rootIds: ROOT_IDS,
			probeIds: ["shape"],
		});
		expect(latestLayers("shape")[0].fillOpacity).toBe(0.9);
	});

	it("works nothing out on a render whose inputs are the same references", () => {
		const base = toObjects(frame("frame", 100), captioned("shape", 100));
		const render = mountHost();
		render({ objects: base, rootIds: ROOT_IDS, probeIds: ["shape"] });
		const passesBefore = passCalls.count;
		const rendersBefore = probeRenders.get("shape")!.length;

		// The canvas re-renders on the very same inputs, no drag passed.
		render({ objects: base, rootIds: ROOT_IDS, probeIds: ["shape"] });
		render({ objects: base, rootIds: ROOT_IDS, probeIds: ["shape"] });

		expect(passCalls.count).toBe(passesBefore);
		expect(probeRenders.get("shape")).toHaveLength(rendersBefore);
	});

	it("works the layers out again on any new objects (undo, typing, a sync)", () => {
		// The frame spans x 0..200; the caption's box starts at x 160, so its
		// center sits at 160 + 5 per character.
		const render = mountHost();
		render({
			objects: toObjects(frame("frame", 100), captioned("shape", 180)),
			rootIds: ROOT_IDS,
			probeIds: ["shape"],
		});
		expect(latestLayers("shape")).toHaveLength(1);

		// Typed into the caption's draft, the box widens and its center (205)
		// leaves the frame.
		render({
			objects: toObjects(
				frame("frame", 100),
				captioned("shape", 180, "Hi there!"),
			),
			rootIds: ROOT_IDS,
			probeIds: ["shape"],
		});
		expect(latestLayers("shape")).toBe(NO_LABEL_BACKDROP_LAYERS);

		// Undone: back to the two-character caption, its center (170) inside.
		render({
			objects: toObjects(frame("frame", 100), captioned("shape", 180)),
			rootIds: ROOT_IDS,
			probeIds: ["shape"],
		});
		expect(latestLayers("shape")).toHaveLength(1);
	});

	it("gives a label pasted onto a frame its layers on its first render", () => {
		const render = mountHost();
		render({
			objects: toObjects(frame("frame", 100), captioned("shape", 100)),
			rootIds: ROOT_IDS,
			probeIds: ["shape"],
		});
		render({
			objects: toObjects(
				frame("frame", 100),
				captioned("shape", 100),
				captioned("pasted", 60),
			),
			rootIds: [...ROOT_IDS, "pasted"],
			probeIds: ["shape", "pasted"],
		});
		expect(probeRenders.get("pasted")).toHaveLength(1);
		expect(latestLayers("pasted")).toHaveLength(1);
	});

	it("keeps an unchanged label's layers and does not re-render it while another is dragged away", () => {
		const base = toObjects(
			frame("frame", 100),
			captioned("shape", 100),
			captioned("other", 60),
		);
		const render = mountHost();
		render({
			objects: base,
			rootIds: [...ROOT_IDS, "other"],
			probeIds: ["shape", "other"],
		});
		const otherLayers = latestLayers("other");
		const otherRenderCount = probeRenders.get("other")!.length;

		// "shape" dragged out of the frame over two frames; "other" stays.
		render({
			objects: dragFrame(base, captioned("shape", 150)),
			rootIds: [...ROOT_IDS, "other"],
			probeIds: ["shape", "other"],
		});
		render({
			objects: dragFrame(base, captioned("shape", 600)),
			rootIds: [...ROOT_IDS, "other"],
			probeIds: ["shape", "other"],
		});
		expect(latestLayers("shape")).toBe(NO_LABEL_BACKDROP_LAYERS);
		expect(latestLayers("other")).toBe(otherLayers);
		expect(probeRenders.get("other")).toHaveLength(otherRenderCount);
	});

	it("works the layers out again when a face lands, the objects unchanged", () => {
		// The frame spans x 0..200; the 8-character caption's box starts at
		// x 156, its center at 196 in 10-wide glyphs and 204 in 12-wide ones.
		const objects = toObjects(
			frame("frame", 100),
			captioned("shape", 176, "Hi there"),
		);
		const render = mountHost();
		render({ objects, rootIds: ROOT_IDS, probeIds: ["shape"] });
		expect(latestLayers("shape")).toHaveLength(1);

		// What the canvas does when web fonts land (useDocFonts): measurements
		// answer differently, and the nonce moves.
		glyphWidth.value = 12;
		advanceTextMeasurementGeneration();
		render({ objects, rootIds: ROOT_IDS, fontsNonce: 1, probeIds: ["shape"] });
		expect(latestLayers("shape")).toBe(NO_LABEL_BACKDROP_LAYERS);
	});

	it("works the layers out again when a connector label's editor opens, the objects unchanged", () => {
		const objects = toObjects(frame("frame", 100), {
			id: "connector",
			type: "connector",
			points: [],
			routing: "straight",
			source: { anchor: { kind: "free", point: { x: 0, y: 100 } } },
			target: { anchor: { kind: "free", point: { x: 200, y: 100 } } },
			label: { text: "" },
		} as unknown as ObjectState);
		// One array for both renders, so only the editing session differs.
		const connectorRootIds = ["frame", "connector"];
		const selection = { objectIds: ["connector"], part: null };
		const render = mountHost();
		render({
			objects,
			rootIds: connectorRootIds,
			selection,
			probeIds: ["connector"],
		});
		expect(latestLayers("connector")).toBe(NO_LABEL_BACKDROP_LAYERS);

		render({
			objects,
			rootIds: connectorRootIds,
			selection,
			mode: {
				kind: "textEdit",
				draft: { kind: "connectorLabel", text: "" },
			},
			probeIds: ["connector"],
		});
		expect(latestLayers("connector")).toHaveLength(1);
	});

	it("works nothing out for the keystrokes typed in a connector label's editor", () => {
		const { objects, rootIds, selection, typing } = connectorLabelEdit();
		const render = mountHost();
		render({
			objects,
			rootIds,
			selection,
			mode: typing(""),
			probeIds: ["connector"],
		});
		expect(latestLayers("connector")).toHaveLength(1);
		const passesBefore = passCalls.count;

		render({
			objects,
			rootIds,
			selection,
			mode: typing("H"),
			probeIds: ["connector"],
		});
		render({
			objects,
			rootIds,
			selection,
			mode: typing("HTTPS"),
			probeIds: ["connector"],
		});
		expect(passCalls.count).toBe(passesBefore);
		expect(latestLayers("connector")).toHaveLength(1);
	});

	it("works the layers out once when a connector label's editor opens and once when it closes", () => {
		const { objects, rootIds, selection, typing } = connectorLabelEdit();
		const render = mountHost();
		render({ objects, rootIds, selection, probeIds: ["connector"] });
		const passesBefore = passCalls.count;

		render({
			objects,
			rootIds,
			selection,
			mode: typing(""),
			probeIds: ["connector"],
		});
		expect(passCalls.count).toBe(passesBefore + 1);
		expect(latestLayers("connector")).toHaveLength(1);

		// Closed uncommitted: the label being created is gone again.
		render({ objects, rootIds, selection, probeIds: ["connector"] });
		expect(passCalls.count).toBe(passesBefore + 2);
		expect(latestLayers("connector")).toBe(NO_LABEL_BACKDROP_LAYERS);
	});

	it("works nothing out at a pan's start, on its frames or at its end", () => {
		const base = toObjects(frame("frame", 100), captioned("shape", 100));
		const pan = { kind: "pan" } as const;
		const render = mountHost();
		render({ objects: base, rootIds: ROOT_IDS, probeIds: ["shape"] });
		const passesBefore = passCalls.count;

		// The pan starts, scrolls the view twice (new visible sets), and ends.
		render({
			objects: base,
			rootIds: ROOT_IDS,
			drag: pan,
			visibleIds: new Set(ROOT_IDS),
			probeIds: ["shape"],
		});
		render({
			objects: base,
			rootIds: ROOT_IDS,
			drag: pan,
			visibleIds: new Set(["frame"]),
			probeIds: ["shape"],
		});
		render({
			objects: base,
			rootIds: ROOT_IDS,
			drag: pan,
			visibleIds: new Set(),
			probeIds: ["shape"],
		});
		render({ objects: base, rootIds: ROOT_IDS, probeIds: ["shape"] });

		expect(passCalls.count).toBe(passesBefore);
	});

	it("works a move that shifted a connector out exactly once, at the drop, even on the objects its last frame drew", () => {
		const { startObjects, rootIds, moveFrame } = connectorMove();
		const render = mountHost();
		render({ objects: startObjects, rootIds, probeIds: ["connector"] });
		const frame1 = moveFrame(20);
		render({ ...frame1, rootIds, probeIds: ["connector"] });
		const passesBefore = passCalls.count;

		// The drop on the very objects of the last frame, then a plain re-render.
		render({ objects: frame1.objects, rootIds, probeIds: ["connector"] });
		render({ objects: frame1.objects, rootIds, probeIds: ["connector"] });
		expect(passCalls.count).toBe(passesBefore + 1);
	});

	it("works nothing out at the drop of a move that took no center from the drag", () => {
		const base = toObjects(frame("frame", 100), captioned("shape", 100));
		const moved = dragFrame(base, captioned("shape", 120));
		const render = mountHost();
		render({ objects: base, rootIds: ROOT_IDS, probeIds: ["shape"] });
		render({
			objects: moved,
			rootIds: ROOT_IDS,
			drag: { kind: "move" },
			movePreview: {
				delta: { x: 20, y: 0 },
				translatedIds: new Set(["shape"]),
				startObjects: base,
			},
			visibleIds: new Set(ROOT_IDS),
			probeIds: ["shape"],
		});
		const passesBefore = passCalls.count;

		render({ objects: moved, rootIds: ROOT_IDS, probeIds: ["shape"] });
		expect(passCalls.count).toBe(passesBefore);
	});

	it("works out an export's scope when only the scope changes, and the whole tree after it", () => {
		const objects = toObjects(frame("frame", 100), captioned("shape", 100));
		const render = mountHost();
		render({ objects, rootIds: ROOT_IDS, probeIds: ["shape"] });
		expect(latestLayers("shape")).toHaveLength(1);

		render({
			objects,
			rootIds: ROOT_IDS,
			snapshotRenderScope: buildIdsWithAncestors(["shape"], objects),
			probeIds: ["shape"],
		});
		expect(latestLayers("shape")).toBe(NO_LABEL_BACKDROP_LAYERS);

		render({ objects, rootIds: ROOT_IDS, probeIds: ["shape"] });
		expect(latestLayers("shape")).toHaveLength(1);
	});

	it("treats an export of everything as no scope at all", () => {
		const objects = toObjects(frame("frame", 100), captioned("shape", 100));
		const render = mountHost();
		render({ objects, rootIds: ROOT_IDS, probeIds: ["shape"] });
		const layers = latestLayers("shape");
		render({
			objects,
			rootIds: ROOT_IDS,
			snapshotRenderScope: "all",
			probeIds: ["shape"],
		});
		expect(latestLayers("shape")).toBe(layers);
	});

	it("works out an export's scope taken mid-drag, and the whole tree after it", () => {
		const base = toObjects(frame("frame", 100), captioned("shape", 100));
		const render = mountHost();
		render({ objects: base, rootIds: ROOT_IDS, probeIds: ["shape"] });
		const midDrag = dragFrame(base, captioned("shape", 110));
		render({ objects: midDrag, rootIds: ROOT_IDS, probeIds: ["shape"] });
		render({
			objects: midDrag,
			rootIds: ROOT_IDS,
			snapshotRenderScope: buildIdsWithAncestors(["shape"], midDrag),
			probeIds: ["shape"],
		});
		expect(latestLayers("shape")).toBe(NO_LABEL_BACKDROP_LAYERS);

		render({ objects: midDrag, rootIds: ROOT_IDS, probeIds: ["shape"] });
		expect(latestLayers("shape")).toHaveLength(1);
	});
});
