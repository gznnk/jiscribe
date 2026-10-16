// The argument typing is what is under test here: `expectTypeOf` fails `pnpm typecheck`,
// not the test run, if the inference changes.

import type { ObjectDoc } from "@jiscribe/doc";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { defineObjectAiTool } from "../ObjectAiTool";

describe("defineObjectAiTool", () => {
	it("types args as z.object reads the shape: optional left out, defaulted filled in", () => {
		const tool = defineObjectAiTool({
			name: "probe_read",
			description: "Reads a probe.",
			objectType: "probe",
			inputSchema: {
				count: z.number(),
				label: z.string().optional(),
				scale: z.number().default(1),
			},
			read: (_objectDoc, args) => {
				expectTypeOf(args).toEqualTypeOf<{
					count: number;
					label?: string | undefined;
					scale: number;
				}>();
				return `${args.count}`;
			},
		});

		expect(tool.name).toBe("probe_read");
	});

	it("types the doc against the annotation apply gives it", () => {
		type ProbeDoc = ObjectDoc & { size: number };
		const tool = defineObjectAiTool({
			name: "probe_grow",
			description: "Grows a probe.",
			objectType: "probe",
			inputSchema: { amount: z.number() },
			apply: (objectDoc: ProbeDoc, { amount }) => {
				expectTypeOf(objectDoc).toEqualTypeOf<ProbeDoc>();
				expectTypeOf(amount).toEqualTypeOf<number>();
				return {
					doc: { ...objectDoc, size: objectDoc.size + amount },
					text: "grown",
				};
			},
		});

		expect(tool.read).toBeUndefined();
	});

	it("types args as empty for an empty shape", () => {
		defineObjectAiTool({
			name: "probe_peek",
			description: "Peeks at a probe.",
			objectType: "probe",
			inputSchema: {},
			read: (_objectDoc, args) => {
				expectTypeOf(args).toEqualTypeOf<Record<string, never>>();
				return "peeked";
			},
		});
	});
});
