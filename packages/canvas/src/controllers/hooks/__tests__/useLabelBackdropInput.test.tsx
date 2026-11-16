// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ConnectorLabelDraftObjects } from "../../utils/graftConnectorLabelDraft";
import { useLabelBackdropInput } from "../useLabelBackdropInput";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type InputState = Pick<CanvasControllerState, "objects" | "selection" | "mode">;

const objects: Record<string, ObjectState> = {
	connector: {
		id: "connector",
		type: "connector",
		points: [],
		routing: "straight",
		source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
		target: { anchor: { kind: "free", point: { x: 100, y: 0 } } },
	} as unknown as ObjectState,
};
const selection = { objectIds: ["connector"], part: null };
const PLACEMENT = { position: 0.5, offset: 0 };

/** The session with `text` typed into a label being created at PLACEMENT. */
const typing = (text: string): InputState => ({
	objects,
	selection,
	mode: {
		kind: "textEdit",
		draft: { kind: "connectorLabel", text, placement: PLACEMENT },
	},
});

let unmount: (() => void) | null = null;

afterEach(() => {
	unmount?.();
	unmount = null;
});

/** Mounts the hook and reports every input it handed back, newest last. */
const mountInput = () => {
	const seen: ConnectorLabelDraftObjects[] = [];
	const Probe = ({ state }: { state: InputState }) => {
		seen.push(useLabelBackdropInput(state));
		return null;
	};
	const root = createRoot(document.createElement("div"));
	unmount = () => act(() => root.unmount());
	return {
		seen,
		render: (state: InputState) =>
			act(() => root.render(<Probe state={state} />)),
	};
};

describe("useLabelBackdropInput", () => {
	it("hands back the same input for every keystroke in a connector label's editor", () => {
		const input = mountInput();
		input.render(typing(""));
		input.render(typing("H"));
		input.render(typing("HTTPS"));

		expect(input.seen[0].labelEditOwnerId).toBe("connector");
		expect(input.seen[1]).toBe(input.seen[0]);
		expect(input.seen[2]).toBe(input.seen[0]);
	});

	it("hands back a new input when the label's editor opens and when it closes", () => {
		const input = mountInput();
		input.render({ objects, selection, mode: { kind: "normal" } });
		input.render(typing(""));
		input.render({ objects, selection, mode: { kind: "normal" } });

		expect(input.seen[0].objects).toBe(objects);
		expect(input.seen[1].labelEditOwnerId).toBe("connector");
		expect(input.seen[2].labelEditOwnerId).toBeNull();
		expect(input.seen[2].objects).toBe(objects);
	});
});
