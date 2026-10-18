// Argument schemas the entity tools share, so a column range is written the same
// way in every one of them.

import { z } from "zod";

/** The first column a call acts on. */
export const erEntityColumnSchema = z
	.number()
	.int()
	.min(0)
	.describe("First column the call acts on, 0-based from the top.");

/**
 * How many columns a range spans downwards from `column`.
 *
 * @param actionText - What the call does to them, worded into the description, e.g. "delete"
 * @returns The optional count, 1 when omitted
 */
export const createErEntityColumnCountSchema = (actionText: string) =>
	z
		.number()
		.int()
		.min(1)
		.optional()
		.describe(
			`How many consecutive columns to ${actionText}, downwards from column; omit for 1. It must stay inside the entity.`,
		);
