import { describe, expect, it } from "vitest";

import { getEditingEndpoint } from "../getEditingEndpoint";

describe("getEditingEndpoint", () => {
	it("edit:source の targetId からは source を返す", () => {
		expect(getEditingEndpoint("connection-anchor:edit:c1:source")).toBe(
			"source",
		);
	});

	it("edit:target の targetId からは target を返す", () => {
		expect(getEditingEndpoint("connection-anchor:edit:c1:target")).toBe(
			"target",
		);
	});

	it("targetId が undefined のときは target（デフォルト）を返す", () => {
		expect(getEditingEndpoint(undefined)).toBe("target");
	});

	it("新規作成（create）モードの targetId では target を返す", () => {
		expect(
			getEditingEndpoint("connection-anchor:create:rect-1:topCenter"),
		).toBe("target");
	});

	it("endpoint 部分が未知の値ならば target を返す", () => {
		expect(getEditingEndpoint("connection-anchor:edit:c1:middle")).toBe(
			"target",
		);
	});

	it("フォーマット不一致（パーツ数違い）なら target を返す", () => {
		expect(getEditingEndpoint("connection-anchor:edit:c1")).toBe("target");
	});
});
