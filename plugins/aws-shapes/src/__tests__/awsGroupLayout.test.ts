import { createDocOps } from "@jiscribe/doc";
import type { CanvasDoc, ObjectDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { awsShapesDocPlugin } from "../doc";

// The title sits inside the frame (`features.text: "innerLabel"`), so the layout
// keeps no room below an awsGroup laid out as a box for a caption it does not
// hang there.
describe("layoutObjects on an empty awsGroup with a title", () => {
	const docOps = createDocOps({ plugins: [awsShapesDocPlugin] });

	it("keeps the rank spacing below it, as below any box", () => {
		const doc: CanvasDoc = { version: 1, root: [] } as unknown as CanvasDoc;
		docOps.addObject(doc, "awsGroup", {
			x: 0,
			y: 0,
			width: 320,
			height: 200,
			text: "Production VPC",
		});
		docOps.addObject(doc, "rect", { x: 500, y: 500, width: 160, height: 80 });
		docOps.connect(doc, { sourceId: "awsGroup-1", targetId: "rect-1" });

		const result = docOps.layoutObjects(doc, undefined, { rankSpacing: 60 });

		expect(result.containerIds).toEqual([]);
		expect(result.restackedConnectorIds).toEqual([]);
		const boxOf = (id: string) =>
			doc.root.find((object) => object.id === id) as
				(ObjectDoc & { y: number; height: number }) | undefined;
		const group = boxOf("awsGroup-1");
		const rect = boxOf("rect-1");
		expect(group).toBeDefined();
		expect(rect).toBeDefined();
		expect((rect?.y ?? 0) - ((group?.y ?? 0) + (group?.height ?? 0))).toBe(60);
	});
});
