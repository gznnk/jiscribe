// @vitest-environment jsdom

import type { CommentThreadDoc } from "@jiscribe/doc/model/objects/base/CommentThreadDoc";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CommentPanel } from "../CommentPanel";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const AUTHOR = "Ada";
const OTHER_AUTHOR = "Grace";

const makeThread = (
	id: string,
	createdAt: string,
	options: {
		author?: string;
		resolved?: boolean;
		resolvedBy?: string;
		replies?: number;
	} = {},
): CommentThreadDoc => {
	const author = options.author ?? AUTHOR;
	const comments = [
		{
			id: `${id}-root`,
			author,
			body: `root of ${id}`,
			createdAt,
		},
	];
	for (let index = 0; index < (options.replies ?? 0); index++) {
		comments.push({
			id: `${id}-reply-${index}`,
			author,
			body: `reply ${index} of ${id}`,
			createdAt,
		});
	}
	return {
		id,
		...(options.resolved === true
			? { resolved: true, resolvedBy: options.resolvedBy ?? OTHER_AUTHOR }
			: {}),
		comments,
	};
};

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

const render = (element: React.ReactElement): HTMLDivElement => {
	if (!container) {
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
	}
	const mounted = root;
	act(() => {
		mounted?.render(element);
	});
	return container;
};

const queryAll = (testId: string): HTMLElement[] =>
	Array.from(
		container?.querySelectorAll(`[data-testid="${testId}"]`) ?? [],
	).filter((element): element is HTMLElement => element instanceof HTMLElement);

const queryOne = (testId: string): HTMLElement => {
	const [first] = queryAll(testId);
	if (!first) {
		throw new Error(`the panel rendered no [data-testid="${testId}"]`);
	}
	return first;
};

const click = (target: EventTarget): void => {
	act(() => {
		target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
	});
};

/** What React's own change handler needs: the value set through the native setter it tracks. */
const type = (textArea: HTMLElement, text: string): void => {
	const setValue = Object.getOwnPropertyDescriptor(
		HTMLTextAreaElement.prototype,
		"value",
	)?.set;
	act(() => {
		setValue?.call(textArea, text);
		textArea.dispatchEvent(new Event("input", { bubbles: true }));
	});
};

const renderPanel = (
	threads: CommentThreadDoc[],
	overrides: {
		commentAuthor?: string;
		onCommentUpdate?: (op: unknown) => void;
	} = {},
): ((op: unknown) => void) => {
	const onCommentUpdate = overrides.onCommentUpdate ?? vi.fn();
	render(
		<CommentPanel
			objectId="rect-1"
			objectLabel="Box"
			threads={threads}
			commentAuthor={
				"commentAuthor" in overrides ? overrides.commentAuthor : AUTHOR
			}
			placement="menu"
			onCommentUpdate={onCommentUpdate}
		/>,
	);
	return onCommentUpdate;
};

afterEach(() => {
	act(() => {
		root?.unmount();
	});
	container?.remove();
	container = null;
	root = null;
});

describe("CommentPanel", () => {
	it("orders the open threads newest first and expands the newest one", () => {
		renderPanel([
			makeThread("old", "2026-01-01T09:00:00.000Z"),
			makeThread("new", "2026-02-01T09:00:00.000Z"),
		]);

		const threads = queryAll("comment-thread");
		expect(threads.map((thread) => thread.dataset.threadId)).toEqual([
			"new",
			"old",
		]);
		expect(threads[0].dataset.expanded).toBe("true");
		expect(threads[1].dataset.expanded).toBe("false");
		expect(queryOne("comment-panel").dataset.placement).toBe("menu");
	});

	it("expands the thread whose collapsed row is clicked, collapsing the other", () => {
		renderPanel([
			makeThread("old", "2026-01-01T09:00:00.000Z"),
			makeThread("new", "2026-02-01T09:00:00.000Z"),
		]);

		click(queryAll("comment-thread")[1]);

		const threads = queryAll("comment-thread");
		expect(threads[0].dataset.expanded).toBe("false");
		expect(threads[1].dataset.expanded).toBe("true");
	});

	it("keeps the resolved threads behind a collapsed section carrying their count", () => {
		renderPanel([
			makeThread("open-1", "2026-02-01T09:00:00.000Z"),
			makeThread("done-1", "2026-01-02T09:00:00.000Z", { resolved: true }),
			makeThread("done-2", "2026-01-01T09:00:00.000Z", { resolved: true }),
		]);

		const toggle = queryOne("comment-resolved-toggle");
		expect(toggle.textContent).toContain("2");
		expect(
			queryAll("comment-thread").map((thread) => thread.dataset.threadId),
		).toEqual(["open-1"]);

		click(toggle);

		expect(
			queryAll("comment-thread").map((thread) => thread.dataset.threadId),
		).toEqual(["open-1", "done-1", "done-2"]);
		// Only the expanded thread offers the way back, so one has to be opened first.
		expect(queryAll("comment-reopen").length).toBe(0);

		click(queryAll("comment-thread")[1]);

		expect(queryAll("comment-reopen").length).toBe(1);
	});

	it("posts a reply carrying the author it was given", () => {
		const onCommentUpdate = renderPanel([
			makeThread("thread-1", "2026-02-01T09:00:00.000Z"),
		]);

		type(queryOne("comment-composer"), "  looks good  ");
		click(queryOne("comment-submit"));

		expect(onCommentUpdate).toHaveBeenCalledTimes(1);
		const op = vi.mocked(onCommentUpdate).mock.calls[0][0] as {
			kind: string;
			objectId: string;
			threadId: string;
			comment: { author: string; body: string; createdAt: string };
		};
		expect(op.kind).toBe("addReply");
		expect(op.objectId).toBe("rect-1");
		expect(op.threadId).toBe("thread-1");
		expect(op.comment.author).toBe(AUTHOR);
		expect(op.comment.body).toBe("looks good");
		expect(Number.isNaN(new Date(op.comment.createdAt).getTime())).toBe(false);
	});

	it("posts nothing while the composer holds only whitespace", () => {
		const onCommentUpdate = renderPanel([
			makeThread("thread-1", "2026-02-01T09:00:00.000Z"),
		]);

		type(queryOne("comment-composer"), "   ");
		click(queryOne("comment-submit"));

		expect(onCommentUpdate).not.toHaveBeenCalled();
	});

	it("resolves a thread through its check button", () => {
		const onCommentUpdate = renderPanel([
			makeThread("thread-1", "2026-02-01T09:00:00.000Z"),
		]);

		click(queryOne("comment-resolve"));

		expect(onCommentUpdate).toHaveBeenCalledWith({
			kind: "resolveThread",
			objectId: "rect-1",
			threadId: "thread-1",
			resolvedBy: AUTHOR,
		});
	});

	it("offers edit and delete on one's own comment only", () => {
		renderPanel([
			makeThread("thread-1", "2026-02-01T09:00:00.000Z", {
				author: OTHER_AUTHOR,
			}),
		]);

		expect(queryAll("comment-edit").length).toBe(0);
		expect(queryAll("comment-delete").length).toBe(0);

		act(() => {
			root?.render(
				<CommentPanel
					objectId="rect-1"
					objectLabel="Box"
					threads={[makeThread("thread-1", "2026-02-01T09:00:00.000Z")]}
					commentAuthor={AUTHOR}
					placement="menu"
					onCommentUpdate={vi.fn()}
				/>,
			);
		});

		expect(queryAll("comment-edit").length).toBe(1);
		expect(queryAll("comment-delete").length).toBe(1);
	});

	it("deletes a comment without asking first", () => {
		const onCommentUpdate = renderPanel([
			makeThread("thread-1", "2026-02-01T09:00:00.000Z"),
		]);

		click(queryOne("comment-delete"));

		expect(onCommentUpdate).toHaveBeenCalledWith({
			kind: "deleteComment",
			objectId: "rect-1",
			threadId: "thread-1",
			commentId: "thread-1-root",
		});
	});

	it("saves an edit with the body it was given", () => {
		const onCommentUpdate = renderPanel([
			makeThread("thread-1", "2026-02-01T09:00:00.000Z"),
		]);

		click(queryOne("comment-edit"));
		type(queryOne("comment-edit-input"), "reworded");
		click(queryOne("comment-edit-save"));

		expect(onCommentUpdate).toHaveBeenCalledTimes(1);
		const op = vi.mocked(onCommentUpdate).mock.calls[0][0] as {
			kind: string;
			body: string;
			commentId: string;
		};
		expect(op.kind).toBe("editComment");
		expect(op.commentId).toBe("thread-1-root");
		expect(op.body).toBe("reworded");
	});

	it("opens a new-thread composer from the footer and posts a thread", () => {
		const onCommentUpdate = renderPanel([]);

		expect(queryAll("comment-composer").length).toBe(0);
		click(queryOne("comment-new-thread"));
		type(queryOne("comment-composer"), "first note");
		click(queryOne("comment-submit"));

		const op = vi.mocked(onCommentUpdate).mock.calls[0][0] as {
			kind: string;
			threadId: string;
			comment: { body: string };
		};
		expect(op.kind).toBe("addThread");
		expect(op.threadId).not.toBe("");
		expect(op.comment.body).toBe("first note");
	});

	it("is read-only without an author name", () => {
		renderPanel([makeThread("thread-1", "2026-02-01T09:00:00.000Z")], {
			commentAuthor: undefined,
		});

		expect(queryAll("comment-composer").length).toBe(0);
		expect(queryAll("comment-new-thread").length).toBe(0);
		expect(queryAll("comment-resolve").length).toBe(0);
		expect(queryAll("comment-edit").length).toBe(0);
		expect(queryAll("comment-delete").length).toBe(0);
		expect(queryOne("comment-readonly").textContent).not.toBe("");
		// The threads themselves still read.
		expect(queryAll("comment-body").length).toBe(1);
	});

	it("is read-only for a blank author name too", () => {
		renderPanel([makeThread("thread-1", "2026-02-01T09:00:00.000Z")], {
			commentAuthor: "   ",
		});

		expect(queryAll("comment-composer").length).toBe(0);
		expect(queryAll("comment-readonly").length).toBe(1);
	});
});
