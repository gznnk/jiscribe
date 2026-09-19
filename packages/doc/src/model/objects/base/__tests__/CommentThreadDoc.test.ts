import { describe, expect, it } from "vitest";

import {
	countOpenCommentThreads,
	isCommentDoc,
	isCommentThreadDoc,
	readCommentThreads,
	type CommentDoc,
	type CommentThreadDoc,
} from "../CommentThreadDoc";

const comment = (id: string, body = "Looks off to me"): CommentDoc => ({
	id,
	author: "Ada",
	body,
	createdAt: "2026-09-16T09:00:00.000Z",
});

const thread = (
	id: string,
	overrides: Partial<CommentThreadDoc> = {},
): CommentThreadDoc => ({
	id,
	comments: [comment(`${id}-c1`)],
	...overrides,
});

describe("isCommentDoc", () => {
	it("accepts a comment as posted, without editedAt", () => {
		expect(isCommentDoc(comment("c1"))).toBe(true);
	});

	it("accepts a comment carrying editedAt", () => {
		expect(
			isCommentDoc({ ...comment("c1"), editedAt: "2026-09-16T10:00:00.000Z" }),
		).toBe(true);
	});

	it("accepts an empty body (a comment may say nothing)", () => {
		expect(isCommentDoc(comment("c1", ""))).toBe(true);
	});

	it.each(["id", "author", "body", "createdAt"] as const)(
		"rejects a comment missing %s",
		(field) => {
			const incomplete: Record<string, unknown> = { ...comment("c1") };
			delete incomplete[field];

			expect(isCommentDoc(incomplete)).toBe(false);
		},
	);

	it("rejects a mistyped field", () => {
		expect(isCommentDoc({ ...comment("c1"), body: 42 })).toBe(false);
		expect(isCommentDoc({ ...comment("c1"), editedAt: 42 })).toBe(false);
	});

	it("rejects non-objects", () => {
		expect(isCommentDoc(null)).toBe(false);
		expect(isCommentDoc(undefined)).toBe(false);
		expect(isCommentDoc("c1")).toBe(false);
	});
});

describe("isCommentThreadDoc", () => {
	it("accepts an open thread holding one comment", () => {
		expect(isCommentThreadDoc(thread("t1"))).toBe(true);
	});

	it("accepts a resolved thread naming who resolved it", () => {
		expect(
			isCommentThreadDoc(thread("t1", { resolved: true, resolvedBy: "Grace" })),
		).toBe(true);
	});

	it("rejects a thread with no comments: a thread is its comments", () => {
		expect(isCommentThreadDoc({ id: "t1", comments: [] })).toBe(false);
	});

	it("rejects a thread whose comments are not an array", () => {
		expect(isCommentThreadDoc({ id: "t1", comments: comment("c1") })).toBe(
			false,
		);
	});

	it("rejects a thread holding one malformed comment", () => {
		expect(
			isCommentThreadDoc({
				id: "t1",
				comments: [comment("c1"), { id: "c2", author: "Ada" }],
			}),
		).toBe(false);
	});

	it("rejects a thread missing its id", () => {
		expect(isCommentThreadDoc({ comments: [comment("c1")] })).toBe(false);
	});

	it("rejects mistyped resolution fields", () => {
		expect(isCommentThreadDoc({ ...thread("t1"), resolved: "yes" })).toBe(
			false,
		);
		expect(isCommentThreadDoc({ ...thread("t1"), resolvedBy: 7 })).toBe(false);
	});

	it("rejects non-objects", () => {
		expect(isCommentThreadDoc(null)).toBe(false);
		expect(isCommentThreadDoc(["t1"])).toBe(false);
	});
});

describe("readCommentThreads", () => {
	it("reads the threads in document order", () => {
		const threads = readCommentThreads({
			comments: [thread("t1"), thread("t2")],
		});

		expect(threads.map((read) => read.id)).toEqual(["t1", "t2"]);
	});

	it("drops malformed entries and keeps the order of what is left", () => {
		const threads = readCommentThreads({
			comments: [
				thread("t1"),
				{ id: "broken", comments: [] },
				"not a thread",
				thread("t2"),
			],
		});

		expect(threads.map((read) => read.id)).toEqual(["t1", "t2"]);
	});

	it("returns nothing for meta without comments, and for no meta at all", () => {
		expect(readCommentThreads(undefined)).toEqual([]);
		expect(readCommentThreads({ name: "Server" })).toEqual([]);
	});

	it("returns nothing when comments is not an array", () => {
		expect(readCommentThreads({ comments: thread("t1") })).toEqual([]);
	});
});

describe("countOpenCommentThreads", () => {
	it("counts every thread that is not resolved", () => {
		expect(
			countOpenCommentThreads([
				thread("t1"),
				thread("t2", { resolved: false }),
				thread("t3", { resolved: true, resolvedBy: "Grace" }),
			]),
		).toBe(2);
	});

	it("counts nothing with no threads", () => {
		expect(countOpenCommentThreads([])).toBe(0);
	});
});
