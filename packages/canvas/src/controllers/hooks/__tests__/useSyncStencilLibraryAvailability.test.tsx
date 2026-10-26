// @vitest-environment jsdom

import type { Dispatch } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import type { CanvasAction } from "../../reducer/CanvasActions";
import { useSyncStencilLibraryAvailability } from "../useSyncStencilLibraryAvailability";

// Without this React treats every `act` below as unsupported and warns.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** Mounts the hook on a probe driven by re-rendering with a new answer. */
const renderHook = (hasStencilLibrary: boolean) => {
	const dispatch = vi.fn<Dispatch<CanvasAction>>();
	const Probe = ({ hasLibrary }: { hasLibrary: boolean }) => {
		useSyncStencilLibraryAvailability(hasLibrary, dispatch);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	act(() => root.render(<Probe hasLibrary={hasStencilLibrary} />));
	return {
		dispatch,
		rerender: (hasLibrary: boolean) =>
			act(() => root.render(<Probe hasLibrary={hasLibrary} />)),
		unmount: () => act(() => root.unmount()),
	};
};

const availability = (hasStencilLibrary: boolean): CanvasAction => ({
	type: "SET_STENCIL_LIBRARY_AVAILABILITY",
	hasStencilLibrary,
});

describe("useSyncStencilLibraryAvailability", () => {
	it("reports the mount's answer", () => {
		const { dispatch, unmount } = renderHook(true);
		expect(dispatch.mock.calls).toEqual([[availability(true)]]);
		unmount();
	});

	it("reports again each time the sections go empty or come back", () => {
		const { dispatch, rerender, unmount } = renderHook(false);
		rerender(true);
		rerender(false);
		expect(dispatch.mock.calls).toEqual([
			[availability(false)],
			[availability(true)],
			[availability(false)],
		]);
		unmount();
	});

	it("does not report again while the answer holds", () => {
		const { dispatch, rerender, unmount } = renderHook(true);
		rerender(true);
		expect(dispatch).toHaveBeenCalledTimes(1);
		unmount();
	});
});
