// @vitest-environment jsdom

import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { useTextEditDraftState } from "../useTextEditDraftState";

type TextEditState = CanvasControllerState["textEditState"];

const richText = (text: string): RichText => [{ text }] as unknown as RichText;

const roots: { unmount: () => void }[] = [];

afterEach(() => {
	for (const root of roots) {
		root.unmount();
	}
	roots.length = 0;
});

/** Mounts the hook and returns a way to re-render it with another session, reading back what it returned. */
const mount = (initial: TextEditState) => {
	let returned: TextEditState = null;
	const Probe: React.FC<{ textEditState: TextEditState }> = ({
		textEditState,
	}) => {
		returned = useTextEditDraftState(textEditState);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	roots.push(root);
	const render = (textEditState: TextEditState): TextEditState => {
		act(() => {
			root.render(<Probe textEditState={textEditState} />);
		});
		return returned;
	};
	return { first: render(initial), render };
};

describe("useTextEditDraftState", () => {
	it("holds the session while only the caret moves", () => {
		const opened: TextEditState = { kind: "shape", text: richText("ab") };
		const { first, render } = mount(opened);
		expect(
			render({ ...opened, selection: { start: 1, end: 1 } } as TextEditState),
		).toBe(first);
		expect(
			render({ ...opened, selection: { start: 0, end: 2 } } as TextEditState),
		).toBe(first);
	});

	it("moves to the new session once the draft text is replaced", () => {
		const opened: TextEditState = { kind: "shape", text: richText("ab") };
		const { render } = mount(opened);
		const typed: TextEditState = { kind: "shape", text: richText("abc") };
		expect(render(typed)).toBe(typed);
	});

	it("goes to null when the editor closes, and to the new session when one opens", () => {
		const opened: TextEditState = { kind: "shape", text: richText("ab") };
		const { render } = mount(opened);
		expect(render(null)).toBeNull();
		const reopened: TextEditState = { kind: "shape", text: richText("ab") };
		expect(render(reopened)).toBe(reopened);
	});

	it("moves to the new session when the kind changes", () => {
		const opened: TextEditState = { kind: "shape", text: richText("ab") };
		const { render } = mount(opened);
		const label: TextEditState = { kind: "connectorLabel", text: "ab" };
		expect(render(label)).toBe(label);
	});
});
