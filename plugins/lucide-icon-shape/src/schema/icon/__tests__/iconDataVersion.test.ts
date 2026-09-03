import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

import {
	ICON_ALIASES,
	ICON_NODES,
	LUCIDE_VERSION,
} from "../iconData.generated";

const readInstalledLucideVersion = (): string => {
	const packageJsonPath = createRequire(import.meta.url).resolve(
		"lucide/package.json",
	);
	const parsed: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
	const version =
		typeof parsed === "object" && parsed !== null
			? (parsed as { version?: unknown }).version
			: undefined;
	if (typeof version !== "string") {
		throw new Error(`no version in ${packageJsonPath}`);
	}
	return version;
};

describe("iconData.generated", () => {
	/**
	 * The drawings are committed rather than read from `lucide` at build time, so
	 * nothing else would notice the dependency being bumped without a regeneration —
	 * the icon set would silently stay one release behind its declared version.
	 */
	it("was generated from the lucide version currently installed", () => {
		expect(LUCIDE_VERSION).toBe(readInstalledLucideVersion());
	});

	it("holds a drawing for every icon and resolves every superseded name", () => {
		expect(Object.keys(ICON_NODES).length).toBeGreaterThan(1500);
		for (const [alias, target] of Object.entries(ICON_ALIASES)) {
			expect(ICON_NODES, `alias "${alias}"`).toHaveProperty(target);
			// A superseded name that became an icon of its own would shadow the alias.
			expect(ICON_NODES).not.toHaveProperty(alias);
		}
	});

	it("carries no React list key, which the renderer supplies by index", () => {
		for (const nodes of Object.values(ICON_NODES)) {
			for (const [, attrs] of nodes) {
				expect(attrs).not.toHaveProperty("key");
			}
		}
	});
});
