import { describe, expect, it, vi } from "vitest";

import {
	GIT_USER_NAME_TIMEOUT_MS,
	normalizeCommentAuthor,
	pickCommentAuthor,
	readGitUserName,
	type CommandRunner,
} from "../commentAuthorResolution";

/** Runner answering every call with the same stdout, recording its arguments. */
const makeRunner = (stdout: string): CommandRunner =>
	vi.fn<CommandRunner>(async () => ({ stdout }));

/** Runner that fails the way git does when it is absent or finds no name. */
const makeFailingRunner = (): CommandRunner =>
	vi.fn<CommandRunner>(async () => {
		throw new Error("Command failed: git config user.name");
	});

describe("normalizeCommentAuthor", () => {
	it("trims the surrounding whitespace", () => {
		expect(normalizeCommentAuthor("  Ada Lovelace \n")).toBe("Ada Lovelace");
	});

	it("treats an empty, whitespace-only or absent value as no name", () => {
		expect(normalizeCommentAuthor("")).toBeUndefined();
		expect(normalizeCommentAuthor("   \t\n")).toBeUndefined();
		expect(normalizeCommentAuthor(undefined)).toBeUndefined();
		expect(normalizeCommentAuthor(null)).toBeUndefined();
	});
});

describe("readGitUserName", () => {
	it("asks git in the given directory and trims the line it prints", async () => {
		const runCommand = makeRunner("Ada Lovelace\n");

		expect(await readGitUserName("/repo/docs", runCommand)).toBe(
			"Ada Lovelace",
		);
		expect(runCommand).toHaveBeenCalledWith("git", ["config", "user.name"], {
			cwd: "/repo/docs",
			timeout: GIT_USER_NAME_TIMEOUT_MS,
		});
	});

	it("gives no name when git fails", async () => {
		expect(await readGitUserName("/repo", makeFailingRunner())).toBeUndefined();
	});

	it("gives no name when git prints nothing but whitespace", async () => {
		expect(await readGitUserName("/repo", makeRunner("\n"))).toBeUndefined();
	});
});

describe("pickCommentAuthor", () => {
	it("takes the configured name without running git", async () => {
		const runCommand = makeRunner("Grace Hopper\n");

		expect(
			await pickCommentAuthor("  Ada Lovelace  ", "/repo", runCommand),
		).toBe("Ada Lovelace");
		expect(runCommand).not.toHaveBeenCalled();
	});

	it("falls back to git when the setting is blank", async () => {
		const runCommand = makeRunner("Grace Hopper\n");

		expect(await pickCommentAuthor("   ", "/repo", runCommand)).toBe(
			"Grace Hopper",
		);
		expect(await pickCommentAuthor(undefined, "/repo", runCommand)).toBe(
			"Grace Hopper",
		);
	});

	it("gives no name when the setting is blank and git fails", async () => {
		expect(
			await pickCommentAuthor("", "/repo", makeFailingRunner()),
		).toBeUndefined();
	});
});
