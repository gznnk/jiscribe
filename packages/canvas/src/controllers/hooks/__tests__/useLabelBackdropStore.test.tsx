// @vitest-environment jsdom

import { advanceTextMeasurementGeneration } from "@jiscribe/doc/text/measure/textMeasurementSlot";
import type { Rect } from "@jiscribe/geometry";
import { act, memo } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { LabelBackdropLayer } from "../../../rendering/objects/LabelBackdropStoreContext";
import {
	LabelBackdropStoreContext,
	NO_LABEL_BACKDROP_LAYERS,
} from "../../../rendering/objects/LabelBackdropStoreContext";
import { useLabelBackdropLayers } from "../../../rendering/objects/useLabelBackdropLayers";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { createTextSlotPartKindDefinition } from "../../selection/partKinds/textSlotPartKind";
import { buildIdsWithAncestors } from "../../utils/buildIdsWithAncestors";
import type { SnapshotRenderScope } from "../../utils/SnapshotRenderScope";
import { useLabelBackdropStore } from "../useLabelBackdropStore";

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
	isDragging?: boolean;
	snapshotRenderScope?: SnapshotRenderScope | null;
	fontsNonce?: number;
	/** The labels mounted under the store, each reading its own layers. */
	probeIds: string[];
};

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
	isDragging = false,
	snapshotRenderScope = null,
	fontsNonce = 0,
	probeIds,
}: HostProps) => {
	const store = useLabelBackdropStore({
		objects,
		rootIds,
		fontsNonce,
		snapshotRenderScope,
		isDragging,
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
			{
				rect: { x: 0, y: 0, width: 20, height: 20 },
				fill: "#ff0000",
				fillOpacity: 0.5,
			},
		]);
	});

	it("keeps the layers through a drag and works them out at its end, objects unchanged by the end", () => {
		const render = mountHost();
		render({
			objects: toObjects(frame("frame", 100), captioned("shape", 100)),
			rootIds: ROOT_IDS,
			probeIds: ["shape"],
		});
		// The frame dragged away: nothing is worked out while the drag lasts.
		const draggedAway = toObjects(frame("frame", 600), captioned("shape", 100));
		render({
			objects: draggedAway,
			rootIds: ROOT_IDS,
			isDragging: true,
			probeIds: ["shape"],
		});
		expect(latestLayers("shape")).toHaveLength(1);

		// The drag ends on the very objects its last frame drew.
		render({ objects: draggedAway, rootIds: ROOT_IDS, probeIds: ["shape"] });
		expect(latestLayers("shape")).toBe(NO_LABEL_BACKDROP_LAYERS);
	});

	it("picks up a frame's opacity a menu slider's drag changed, once it ends", () => {
		const render = mountHost();
		render({
			objects: toObjects(frame("frame", 100), captioned("shape", 100)),
			rootIds: ROOT_IDS,
			probeIds: ["shape"],
		});
		const slid = toObjects(frame("frame", 100, 0.9), captioned("shape", 100));
		render({
			objects: slid,
			rootIds: ROOT_IDS,
			isDragging: true,
			probeIds: ["shape"],
		});
		expect(latestLayers("shape")[0].fillOpacity).toBe(0.5);

		render({ objects: slid, rootIds: ROOT_IDS, probeIds: ["shape"] });
		expect(latestLayers("shape")[0].fillOpacity).toBe(0.9);
	});

	it("works the layers out again on any new objects outside a drag (undo, typing, a sync)", () => {
		const render = mountHost();
		render({
			objects: toObjects(frame("frame", 100), captioned("shape", 100)),
			rootIds: ROOT_IDS,
			probeIds: ["shape"],
		});
		// A character typed into the caption's draft widens its box.
		render({
			objects: toObjects(frame("frame", 100), captioned("shape", 100, "Hi!")),
			rootIds: ROOT_IDS,
			probeIds: ["shape"],
		});
		expect(latestLayers("shape")[0].rect.width).toBe(30);

		// Undone: back to the two-character caption.
		render({
			objects: toObjects(frame("frame", 100), captioned("shape", 100)),
			rootIds: ROOT_IDS,
			probeIds: ["shape"],
		});
		expect(latestLayers("shape")[0].rect.width).toBe(20);
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

	it("keeps an unchanged label's layers and does not re-render it, and takes a lost backdrop away", () => {
		const render = mountHost();
		render({
			objects: toObjects(
				frame("frame", 100),
				captioned("shape", 100),
				captioned("other", 60),
			),
			rootIds: [...ROOT_IDS, "other"],
			probeIds: ["shape", "other"],
		});
		const otherLayers = latestLayers("other");
		const otherRenderCount = probeRenders.get("other")!.length;

		// "shape" leaves the frame; "other" stays where it was.
		render({
			objects: toObjects(
				frame("frame", 100),
				captioned("shape", 600),
				captioned("other", 60),
			),
			rootIds: [...ROOT_IDS, "other"],
			probeIds: ["shape", "other"],
		});
		expect(latestLayers("shape")).toBe(NO_LABEL_BACKDROP_LAYERS);
		expect(latestLayers("other")).toBe(otherLayers);
		expect(probeRenders.get("other")).toHaveLength(otherRenderCount);
	});

	it("works the layers out again when a face lands, the objects unchanged", () => {
		const objects = toObjects(frame("frame", 100), captioned("shape", 100));
		const render = mountHost();
		render({ objects, rootIds: ROOT_IDS, probeIds: ["shape"] });
		expect(latestLayers("shape")[0].rect.width).toBe(20);

		// What the canvas does when web fonts land (useDocFonts): measurements
		// answer differently, and the nonce moves.
		glyphWidth.value = 12;
		advanceTextMeasurementGeneration();
		render({ objects, rootIds: ROOT_IDS, fontsNonce: 1, probeIds: ["shape"] });
		expect(latestLayers("shape")[0].rect.width).toBe(24);
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

	it("works out an export's scope mid-drag, leaving out the frames outside it", () => {
		const objects = toObjects(frame("frame", 100), captioned("shape", 100));
		const render = mountHost();
		render({ objects, rootIds: ROOT_IDS, probeIds: ["shape"] });
		render({
			objects,
			rootIds: ROOT_IDS,
			isDragging: true,
			snapshotRenderScope: buildIdsWithAncestors(["shape"], objects),
			probeIds: ["shape"],
		});
		expect(latestLayers("shape")).toBe(NO_LABEL_BACKDROP_LAYERS);
	});
});
