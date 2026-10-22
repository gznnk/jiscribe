// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import type { CanvasAction } from "../../reducer/CanvasActions";
import { usePropertyUpdaters } from "../usePropertyUpdaters";

/**
 * Each updater dispatches its own action with the arguments it was handed,
 * leaving every commit its own undo entry unless the caller asks to coalesce,
 * through callbacks that keep their identity across re-renders.
 */

// Without this React treats every `act` below as unsupported and warns.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const mountUpdaters = () => {
	const dispatch = vi.fn<(action: CanvasAction) => void>();
	let returned: ReturnType<typeof usePropertyUpdaters> | null = null;
	const Probe = () => {
		returned = usePropertyUpdaters(dispatch);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	const render = () => {
		act(() => {
			root.render(<Probe />);
		});
		if (returned === null) {
			throw new Error("the probe did not render");
		}
		return returned;
	};
	return {
		dispatch,
		first: render(),
		render,
		unmount: () => act(() => root.unmount()),
	};
};

describe("usePropertyUpdaters", () => {
	it("dispatches each updater's action, not coalescing unless asked to", () => {
		const { dispatch, first, unmount } = mountUpdaters();
		first.handleStyleIntent({ kind: "fill", color: "#ff0000" }, true);
		first.handleTransformUpdate("width", 40, false);
		first.handleDocumentUpdate("background", "#000000", true, true);
		first.handleMetaUpdate("name", null, true);
		expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
			{
				type: "STYLE_INTENT",
				intent: { kind: "fill", color: "#ff0000" },
				commit: true,
				coalesceHistory: false,
			},
			{
				type: "TRANSFORM_PROPERTY_UPDATE",
				property: "width",
				value: 40,
				commit: false,
				coalesceHistory: false,
			},
			{
				type: "DOCUMENT_PROPERTY_UPDATE",
				property: "background",
				value: "#000000",
				commit: true,
				coalesceHistory: true,
			},
			{
				type: "META_PROPERTY_UPDATE",
				property: "name",
				value: null,
				commit: true,
				coalesceHistory: false,
			},
		]);
		unmount();
	});

	it("keeps every updater's identity across re-renders", () => {
		const { first, render, unmount } = mountUpdaters();
		const next = render();
		expect(next.handleStyleIntent).toBe(first.handleStyleIntent);
		expect(next.handleTransformUpdate).toBe(first.handleTransformUpdate);
		expect(next.handleDocumentUpdate).toBe(first.handleDocumentUpdate);
		expect(next.handleMetaUpdate).toBe(first.handleMetaUpdate);
		unmount();
	});
});
