import { describe, expect, it } from "vitest";

import type { ObjectType } from "../../../../../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import { findConnectableHoverTarget } from "../findConnectableHoverTarget";

const obj = (id: string, type: ObjectType): ObjectState => ({ id, type });

const objects: Record<string, ObjectState> = {
	"rect-1": obj("rect-1", "rect"),
	"rect-2": obj("rect-2", "rect"),
	"connector-1": obj("connector-1", "connector"),
};

/** connector 以外を接続可能とみなす簡易 predicate。 */
const isConnectable = (type: ObjectType): boolean => type !== "connector";

describe("findConnectableHoverTarget", () => {
	it("接続可能な最初の hover 対象を返す", () => {
		const result = findConnectableHoverTarget({
			hovered: [{ id: "rect-1", kind: "object" }],
			objects,
			fixedObjectId: undefined,
			isConnectable,
		});
		expect(result).toEqual({ id: "rect-1", object: objects["rect-1"] });
	});

	it("固定側オブジェクト（fixedObjectId）は自己接続になるため除外する", () => {
		const result = findConnectableHoverTarget({
			hovered: [
				{ id: "rect-1", kind: "object" },
				{ id: "rect-2", kind: "object" },
			],
			objects,
			fixedObjectId: "rect-1",
			isConnectable,
		});
		expect(result).toEqual({ id: "rect-2", object: objects["rect-2"] });
	});

	it("connectable でないオブジェクトは飛ばす", () => {
		const result = findConnectableHoverTarget({
			hovered: [
				{ id: "connector-1", kind: "object" },
				{ id: "rect-2", kind: "object" },
			],
			objects,
			fixedObjectId: undefined,
			isConnectable,
		});
		expect(result).toEqual({ id: "rect-2", object: objects["rect-2"] });
	});

	it("objects に存在しない hover id は無視する", () => {
		const result = findConnectableHoverTarget({
			hovered: [
				{ id: "ghost", kind: "object" },
				{ id: "rect-1", kind: "object" },
			],
			objects,
			fixedObjectId: undefined,
			isConnectable,
		});
		expect(result).toEqual({ id: "rect-1", object: objects["rect-1"] });
	});

	it("該当がなければ null を返す", () => {
		const result = findConnectableHoverTarget({
			hovered: [{ id: "connector-1", kind: "object" }],
			objects,
			fixedObjectId: undefined,
			isConnectable,
		});
		expect(result).toBeNull();
	});
});
