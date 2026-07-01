import { describe, expect, it } from "vitest";

import { theme } from "../../../../../../constants/theme";
import { AUTO_COLOR } from "../../../../../../schemas/objects/utils/autoColor";
import { resolveLabelFill } from "../resolveLabelFill";

describe("resolveLabelFill", () => {
	it("省略（undefined）はキャンバス地色（knockout）に解決する", () => {
		expect(resolveLabelFill(undefined)).toBe(theme.canvasBg);
	});

	it('"auto" もキャンバス地色に解決する（decision: auto→canvasBg）', () => {
		expect(resolveLabelFill(AUTO_COLOR)).toBe(theme.canvasBg);
	});

	it("具体色はそのまま返す", () => {
		expect(resolveLabelFill("#ff0000")).toBe("#ff0000");
	});

	it('"transparent" はそのまま返す（線を透かす選択）', () => {
		expect(resolveLabelFill("transparent")).toBe("transparent");
	});
});
