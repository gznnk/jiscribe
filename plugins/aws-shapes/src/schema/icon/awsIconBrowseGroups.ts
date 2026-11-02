import type { IconSetBrowseGroupDeclaration } from "@jiscribe/canvas-sdk/doc";

/**
 * The sections of the "show all" view, in the order an architecture diagram
 * reaches for them rather than alphabetically. A category the set spells two
 * ways is folded into the one it duplicates. A test holds every category the
 * set has to exactly one section, so a new release adding one fails it.
 */
export const AWS_ICON_BROWSE_GROUP_DECLARATIONS: readonly IconSetBrowseGroupDeclaration[] =
	[
		{ id: "compute", label: "Compute", categories: ["Compute"] },
		{ id: "containers", label: "Containers", categories: ["Containers"] },
		{ id: "storage", label: "Storage", categories: ["Storage"] },
		{ id: "databases", label: "Databases", categories: ["Databases"] },
		{
			id: "networking-content-delivery",
			label: "Networking Content Delivery",
			categories: ["Networking Content Delivery"],
		},
		{
			id: "application-integration",
			label: "Application Integration",
			categories: ["Application Integration"],
		},
		{
			id: "security-identity",
			label: "Security Identity",
			categories: ["Security Identity"],
		},
		{ id: "analytics", label: "Analytics", categories: ["Analytics"] },
		{
			id: "artificial-intelligence",
			label: "Artificial Intelligence",
			categories: ["Artificial Intelligence"],
		},
		{
			id: "developer-tools",
			label: "Developer Tools",
			categories: ["Developer Tools"],
		},
		{
			id: "management-governance",
			label: "Management Governance",
			categories: ["Management Governance", "Management Tools"],
		},
		{ id: "iot", label: "IoT", categories: ["IoT", "Internet of Things"] },
		{
			id: "migration-modernization",
			label: "Migration Modernization",
			categories: ["Migration Modernization"],
		},
		{
			id: "media-services",
			label: "Media Services",
			categories: ["Media Services"],
		},
		{
			id: "front-end-web-mobile",
			label: "Front End Web Mobile",
			categories: ["Front End Web Mobile"],
		},
		{
			id: "business-applications",
			label: "Business Applications",
			categories: ["Business Applications"],
		},
		{
			id: "end-user-computing",
			label: "End User Computing",
			categories: ["End User Computing"],
		},
		{
			id: "customer-enablement",
			label: "Customer Enablement",
			categories: ["Customer Enablement"],
		},
		{
			id: "cloud-financial-management",
			label: "Cloud Financial Management",
			categories: ["Cloud Financial Management"],
		},
		{
			id: "quantum-technologies",
			label: "Quantum Technologies",
			categories: ["Quantum Technologies"],
		},
		{ id: "blockchain", label: "Blockchain", categories: ["Blockchain"] },
		{ id: "games", label: "Games", categories: ["Games"] },
		{ id: "satellite", label: "Satellite", categories: ["Satellite"] },
		{
			id: "general",
			label: "General",
			categories: ["General", "General Icons"],
		},
		{ id: "group", label: "Group", categories: ["Group"] },
	];
