// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type * as ConnectorLabelLayoutModule from "../../../rendering/objects/connector/geometry/label/connectorLabelLayout";
import type { LabelBackdropLayer } from "../../../rendering/objects/LabelBackdropStoreContext";
import { LabelBackdropStoreContext } from "../../../rendering/objects/LabelBackdropStoreContext";
import { useLabelBackdropLayers } from "../../../rendering/objects/useLabelBackdropLayers";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { useDocFonts } from "../useDocFonts";
import { useLabelBackdropStore } from "../useLabelBackdropStore";

/**
 * A web font landing after mount changes how wide a connector's label measures
 * while every object stays as it was. The render reacting to the fonts-loaded
 * counter is the only pass that sees it (the re-measure dispatched after it
 * moves no box and so hands back the same objects), so that pass must already
 * measure in the new face rather than answer from a size cached in the old one.
 */

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** How wide the label measures in whichever face is loaded. */
const labelWidth = vi.hoisted(() => ({ value: 40 }));

// Stands in for the browser's measureText: the face landing is what moves it.
vi.mock(
	"../../../rendering/objects/connector/geometry/label/connectorLabelLayout",
	async (importOriginal) => {
		const actual = await importOriginal<typeof ConnectorLabelLayoutModule>();
		return {
			...actual,
			resolveConnectorLabelBox: () => ({
				width: labelWidth.value,
				height: 20,
			}),
		};
	},
);

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

const objects: Record<string, ObjectState> = {
	frame: {
		id: "frame",
		type: "frame",
		cx: 100,
		cy: 100,
		width: 400,
		height: 400,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		fill: "#ff0000",
		fillOpacity: 1,
	} as unknown as ObjectState,
	connector: {
		id: "connector",
		type: "connector",
		points: [],
		routing: "straight",
		source: { anchor: { kind: "free", point: { x: 0, y: 100 } } },
		target: { anchor: { kind: "free", point: { x: 200, y: 100 } } },
		label: { text: "go" },
	} as unknown as ObjectState,
};
const rootIds = ["frame", "connector"];

/** The connector label's layers, every render recorded in order. */
const renders: Array<readonly LabelBackdropLayer[]> = [];

const Probe = () => {
	renders.push(useLabelBackdropLayers("connector"));
	return null;
};

/** The canvas's wiring: the fonts signal feeding the backdrop store, the objects never changing. */
const Host = () => {
	const { fontsNonce } = useDocFonts({ collectRequests: () => [] });
	const store = useLabelBackdropStore({
		objects,
		rootIds,
		fontsNonce,
		snapshotRenderScope: null,
		isDragging: false,
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
	labelWidth.value = 40;
});

describe("useLabelBackdropStore when a font lands", () => {
	it("cuts a connector label's layers to its width in the new face, the objects unchanged", () => {
		const fonts = stubFontFaceSet();
		const root = createRoot(document.createElement("div"));
		act(() => root.render(<Host />));
		expect(renders.at(-1)?.[0].rect.width).toBe(40);

		labelWidth.value = 56;
		act(() => fonts.fireLoadingDone());

		expect(renders.at(-1)?.[0].rect.width).toBe(56);
		act(() => root.unmount());
	});
});
