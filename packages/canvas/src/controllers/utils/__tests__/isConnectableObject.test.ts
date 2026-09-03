import { ConnectorFeatures } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import { SvgFeatures } from "@jiscribe/doc/model/objects/primitives/svg/SvgDoc";
import { TextFeatures } from "@jiscribe/doc/model/objects/primitives/text/TextDoc";
import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { isConnectableObject } from "../isConnectableObject";

const featuresByType = new Map<ObjectType, ObjectFeatures>([
	["rect", RectFeatures],
	["text", TextFeatures],
	["svg", SvgFeatures],
	["connector", ConnectorFeatures],
]);

const objectMapperRegistry = {
	getFeatures: (type: ObjectType) => featuresByType.get(type),
};

const objectOf = (type: ObjectType): ObjectState => ({ id: "obj-1", type });

describe("isConnectableObject", () => {
	it.each(["rect", "text"] as const)("accepts %s", (type) => {
		expect(isConnectableObject(objectOf(type), objectMapperRegistry)).toBe(
			true,
		);
	});

	it.each(["svg", "connector"] as const)("rejects %s", (type) => {
		expect(isConnectableObject(objectOf(type), objectMapperRegistry)).toBe(
			false,
		);
	});

	it("rejects a type the registry does not know", () => {
		expect(
			isConnectableObject(
				objectOf("unregistered" as ObjectType),
				objectMapperRegistry,
			),
		).toBe(false);
	});

	it.each([null, undefined])("rejects %s", (object) => {
		expect(isConnectableObject(object, objectMapperRegistry)).toBe(false);
	});

	it("ignores a features descriptor stamped on the state", () => {
		const stampedNonConnectable: ObjectState = {
			id: "obj-1",
			type: "rect",
			features: SvgFeatures,
		};
		expect(
			isConnectableObject(stampedNonConnectable, objectMapperRegistry),
		).toBe(true);
	});
});
