// @vitest-environment jsdom

import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { CanvasMode, TextEditDraft } from "../../CanvasTypes";
import { useModeHeldAcrossCaretMoves } from "../useModeHeldAcrossCaretMoves";

const richText = (text: string): RichText => [{ text }] as unknown as RichText;

const editing = (draft: TextEditDraft): CanvasMode => ({
	kind: "textEdit",
	draft,
});

const roots: { unmount: () => void }[] = [];

afterEach(() => {
	for (const root of roots) {
		root.unmount();
	}
	roots.length = 0;
});

/** Mounts the hook and returns a way to re-render it with another mode, reading back what it returned. */
const mount = (initial: CanvasMode) => {
	let returned: CanvasMode = { kind: "normal" };
	const Probe: React.FC<{ mode: CanvasMode }> = ({ mode }) => {
		returned = useModeHeldAcrossCaretMoves(mode);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	roots.push(root);
	const render = (mode: CanvasMode): CanvasMode => {
		act(() => {
			root.render(<Probe mode={mode} />);
		});
		return returned;
	};
	return { first: render(initial), render };
};

describe("useModeHeldAcrossCaretMoves", () => {
	it("holds the session while only the caret moves", () => {
		const opened: TextEditDraft = { kind: "shape", text: richText("ab") };
		const { first, render } = mount(editing(opened));
		expect(
			render(editing({ ...opened, selection: { start: 1, end: 1 } })),
		).toBe(first);
		expect(
			render(editing({ ...opened, selection: { start: 0, end: 2 } })),
		).toBe(first);
	});

	it("moves to the new session once the draft text is replaced", () => {
		const { render } = mount(editing({ kind: "shape", text: richText("ab") }));
		const typed = editing({ kind: "shape", text: richText("abc") });
		expect(render(typed)).toBe(typed);
	});

	it("goes back to normal when the editor closes, and to the new session when one opens", () => {
		const { render } = mount(editing({ kind: "shape", text: richText("ab") }));
		const normal: CanvasMode = { kind: "normal" };
		expect(render(normal)).toBe(normal);
		const reopened = editing({ kind: "shape", text: richText("ab") });
		expect(render(reopened)).toBe(reopened);
	});

	it("moves to the new session when the kind changes", () => {
		const { render } = mount(editing({ kind: "shape", text: richText("ab") }));
		const label = editing({ kind: "connectorLabel", text: "ab" });
		expect(render(label)).toBe(label);
	});
});
