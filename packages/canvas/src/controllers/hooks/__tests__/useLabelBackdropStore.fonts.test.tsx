// @vitest-environment jsdom

import { act } from "react";
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
import { useDocFonts } from "../useDocFonts";
import { useLabelBackdropStore } from "../useLabelBackdropStore";

/**
 * A web font landing after mount changes how wide a caption measures, and so
 * where the center of its box lies, while every object stays as it was. The
 * render reacting to the fonts-loaded counter is the only pass that sees it (the
 * re-measure dispatched after it moves no box and so hands back the same
 * objects), so that pass must already measure in the new face rather than
 * answer from a placement cached in the old one.
 */

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** How wide one character of the caption measures in whichever face is loaded. */
const glyphWidth = { value: 10 };

/** A FontFaceSet stand-in whose `loadingdone` is fired by hand; `ready` never settles. */
const stubFontFaceSet = () => {
	const listeners = new Set<() => void>();
	Object.defineProperty(document, "fonts", {
		configurable: true,
		value: {
			ready: new Promise<void>(() => {}),
			load: () => Promise.resolve([]),
			addEventListener: (_type: string, listener: () => void) => {
				listeners.add(listener);
			},
			removeEventListener: (_type: string, listener: () => void) => {
				listeners.delete(listener);
			},
		},
	});
	return {
		fireLoadingDone: () => {
			for (const listener of [...listeners]) {
				listener();
			}
		},
	};
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
// The caption's box starts 20 left of its shape's center and grows with its text.
registries.objectPartKind.register("captioned", [
	createTextSlotPartKindDefinition({
		region: (state: ObjectState) => {
			const text = (state as ObjectState & { text: { body: { text: string } } })
				.text.body.text;
			return {
				x: -20,
				y: 25,
				width: text.length * glyphWidth.value,
				height: 20,
			};
		},
	}),
]);

const objects: Record<string, ObjectState> = {
	frame: {
		id: "frame",
		type: "frame",
		cx: 100,
		cy: 100,
		width: 200,
		height: 200,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		fill: "#ff0000",
		fillOpacity: 1,
	} as unknown as ObjectState,
	// The 8-character caption's box starts at x 156: its center at 196 in
	// 10-wide glyphs, inside the frame's right edge at x 200, and at 204 in
	// 12-wide ones, outside it.
	shape: {
		id: "shape",
		type: "captioned",
		features: { type: "captioned", geometry: "rect", text: "label" },
		cx: 176,
		cy: 80,
		width: 40,
		height: 40,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		text: { body: { text: "Hi there" } },
	} as unknown as ObjectState,
};
const rootIds = ["frame", "shape"];

/** The caption's layers, every render recorded in order. */
const renders: Array<readonly LabelBackdropLayer[]> = [];

const Probe = () => {
	renders.push(useLabelBackdropLayers("shape"));
	return null;
};

/** The canvas's wiring: the fonts signal feeding the backdrop store, the objects never changing. */
const Host = () => {
	const { fontsNonce } = useDocFonts({ collectRequests: () => [] });
	const store = useLabelBackdropStore({
		objects,
		labelEditOwnerId: null,
		rootIds,
		fontsNonce,
		snapshotRenderScope: null,
		registries,
	});
	return (
		<LabelBackdropStoreContext value={store}>
			<Probe />
		</LabelBackdropStoreContext>
	);
};

afterEach(() => {
	// @ts-expect-error jsdom has no `fonts` to restore, so the stub is removed.
	delete document.fonts;
	renders.length = 0;
	glyphWidth.value = 10;
});

describe("useLabelBackdropStore when a font lands", () => {
	it("judges a caption by where its center lies in the new face, the objects unchanged", () => {
		const fonts = stubFontFaceSet();
		const root = createRoot(document.createElement("div"));
		act(() => root.render(<Host />));
		expect(renders.at(-1)).toHaveLength(1);

		glyphWidth.value = 12;
		act(() => fonts.fireLoadingDone());

		expect(renders.at(-1)).toBe(NO_LABEL_BACKDROP_LAYERS);
		act(() => root.unmount());
	});
});
