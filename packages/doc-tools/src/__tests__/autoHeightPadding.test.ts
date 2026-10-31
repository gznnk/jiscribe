import type { CanvasDoc, ObjectDoc, ObjectDocDefinition } from "@jiscribe/doc";
import type * as standardShapesDoc from "@jiscribe/standard-shapes/doc";
import { describe, expect, it, vi } from "vitest";

import { diagnoseDoc } from "../diagnoseDoc";

/** A cylinder that asks for 2em of room around a derived height instead of the default. */
const { PADDED_DB_TYPE } = vi.hoisted(() => ({ PADDED_DB_TYPE: "paddedDb" }));

vi.mock("@jiscribe/standard-shapes/doc", async (importOriginal) => {
	const original = await importOriginal<typeof standardShapesDoc>();
	const db = original.standardObjectDocDefinitions.get("db")!;
	const paddedDb: ObjectDocDefinition = {
		...db,
		features: { ...db.features, type: PADDED_DB_TYPE },
		autoHeightPaddingEm: 2,
	};
	return {
		...original,
		standardObjectDocDefinitions: new Map([
			...original.standardObjectDocDefinitions,
			[PADDED_DB_TYPE, paddedDb],
		]),
	};
});

/** A heightless cylinder of `type`, its body on the whole height and set to the top. */
const topSetDoc = (type: string, verticalAlign: string): CanvasDoc => ({
	version: 1,
	root: [
		{
			id: "shape",
			type,
			x: 0,
			y: 0,
			width: 200,
			text: "one",
			fontSize: 16,
			textVerticalBasis: "frame",
			verticalAlign,
		} as unknown as ObjectDoc,
	],
});

describe("diagnoseDoc on a type declaring its auto-height padding", () => {
	it("checks the shape at the height that padding derives", () => {
		// A top-set body on the frame basis always reaches past the cylinder's cap
		// (see calcAutoShapeHeight), and the region it reports scales with the
		// height the shape is checked at.
		const [unpadded] = diagnoseDoc(topSetDoc("db", "top"));
		const [padded] = diagnoseDoc(topSetDoc(PADDED_DB_TYPE, "top"));

		expect(unpadded?.message).toMatch(/region /);
		expect(padded?.message).toMatch(/region /);
		const regionOf = (message: string): number[] =>
			message
				.match(/region (-?[\d.]+)\.\.(-?[\d.]+)/)!
				.slice(1)
				.map(Number);
		const [unpaddedTop, unpaddedBottom] = regionOf(unpadded!.message);
		const [paddedTop, paddedBottom] = regionOf(padded!.message);
		expect(paddedBottom - paddedTop).toBeGreaterThan(
			unpaddedBottom - unpaddedTop,
		);
	});

	it("finds nothing past the region at the height that padding derives", () => {
		expect(diagnoseDoc(topSetDoc(PADDED_DB_TYPE, "middle"))).toEqual([]);
	});
});
