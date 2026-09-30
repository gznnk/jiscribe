import { describe, expect, it } from "vitest";

import type { ObjectFactory } from "../../model/objects/types/ObjectFactory";
import type { PointObjectSizeResolver } from "../../model/objects/utils/createPointObjectFactory";
import { declarePointGeometry } from "../declarePointGeometry";

/** A resolver identified by reference alone, the box it answers being irrelevant. */
const measureProbeSize: PointObjectSizeResolver = () => ({
	width: 10,
	height: 20,
});

/** A factory identified by reference alone, never called by the declaration. */
const probeFactory: ObjectFactory = {
	createDoc: () => ({ id: "probe", type: "probe", x: 0, y: 0 }),
	calcDimensions: () => ({ halfWidth: 5, halfHeight: 10 }),
};

describe("declarePointGeometry", () => {
	it("declares the resolver it was given, by reference", () => {
		const declaration = declarePointGeometry(
			measureProbeSize,
			() => probeFactory,
		);

		expect(declaration.pointSize).toBe(measureProbeSize);
	});

	it("builds the factory from that same resolver", () => {
		const received: PointObjectSizeResolver[] = [];

		const declaration = declarePointGeometry(measureProbeSize, (pointSize) => {
			received.push(pointSize);
			return probeFactory;
		});

		expect(received).toEqual([measureProbeSize]);
		expect(received[0]).toBe(declaration.pointSize);
		expect(declaration.factory).toBe(probeFactory);
	});
});
