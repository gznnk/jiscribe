export const ObjectTypes = [
	"rect",
	"ellipse",
	"text",
	"polyline",
	"polygon",
	"group",
	"connector",
	"svg",
	"image",
] as const;

export type ObjectType = (typeof ObjectTypes)[number] | (string & {});
