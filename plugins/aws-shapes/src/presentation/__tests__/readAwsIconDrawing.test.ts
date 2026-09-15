import { describe, expect, it } from "vitest";

import { AWS_ICON_ENTRIES } from "../../schema/icon/iconData.generated";
import { readAwsIconDrawing } from "../readAwsIconDrawing";

const GENERAL_USER = AWS_ICON_ENTRIES["general/user"]!;
const LAMBDA = AWS_ICON_ENTRIES["service/aws-lambda"]!;

describe("readAwsIconDrawing", () => {
	it("takes AWS's own dark drawing on a dark ground", () => {
		expect(readAwsIconDrawing(GENERAL_USER, "dark")).toBe(
			GENERAL_USER.darkNodes,
		);
		expect(readAwsIconDrawing(GENERAL_USER, "light")).toBe(GENERAL_USER.nodes);
	});

	// Most icons are drawn in AWS's category colours, which read on either
	// ground, and the set ships one rendition of them.
	it("keeps the one drawing on both grounds where there is no dark one", () => {
		expect(readAwsIconDrawing(LAMBDA, "dark")).toBe(LAMBDA.nodes);
		expect(readAwsIconDrawing(LAMBDA, "light")).toBe(LAMBDA.nodes);
	});
});
