// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CanvasAction } from "../../reducer/CanvasActions";
import { useRunPendingCommand } from "../useRunPendingCommand";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let queuedFrames: FrameRequestCallback[];

const unmounts: (() => void)[] = [];

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
	queuedFrames = [];
	vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
		queuedFrames.push(callback);
		return queuedFrames.length;
	});
});

afterEach(() => {
	unmounts.splice(0).forEach((unmount) => unmount());
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

/** Runs the frame callbacks currently queued, as one browser frame would. */
const runFrame = (): void => {
	queuedFrames.splice(0).forEach((callback) => callback(0));
};

const mount = (isPending: boolean) => {
	const dispatch = vi.fn<(action: CanvasAction) => void>();
	const Probe = ({ pending }: { pending: boolean }) => {
		useRunPendingCommand(pending, dispatch);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	act(() => root.render(<Probe pending={isPending} />));
	let isMounted = true;
	const unmount = (): void => {
		if (isMounted) {
			isMounted = false;
			act(() => root.unmount());
		}
	};
	unmounts.push(unmount);
	return {
		dispatch,
		unmount,
		rerender: (pending: boolean) => {
			act(() => root.render(<Probe pending={pending} />));
		},
	};
};

describe("useRunPendingCommand", () => {
	it("dispatches only after two frames and a macrotask", () => {
		const { dispatch } = mount(true);

		runFrame();
		vi.runAllTimers();
		expect(dispatch).not.toHaveBeenCalled();

		runFrame();
		expect(dispatch).not.toHaveBeenCalled();

		vi.runAllTimers();
		expect(dispatch).toHaveBeenCalledExactlyOnceWith({
			type: "RUN_PENDING_COMMAND",
		});
	});

	it.each([
		["an unmount", ({ unmount }: ReturnType<typeof mount>) => unmount()],
		[
			"the flag clearing",
			({ rerender }: ReturnType<typeof mount>) => rerender(false),
		],
	])("does not dispatch after %s before the macrotask", (_name, cancel) => {
		const mounted = mount(true);
		runFrame();
		runFrame();

		cancel(mounted);

		vi.runAllTimers();
		expect(mounted.dispatch).not.toHaveBeenCalled();
	});

	it("is not restarted by a render that leaves the flag as it is", () => {
		const { dispatch, rerender } = mount(true);
		runFrame();

		rerender(true);

		runFrame();
		vi.runAllTimers();
		expect(dispatch).toHaveBeenCalledTimes(1);
	});
});
