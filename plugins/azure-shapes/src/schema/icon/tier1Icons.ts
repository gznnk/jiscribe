import type { IconSetPaletteEntry } from "@jiscribe/canvas-sdk/doc";

/**
 * The icons the palette carries (tier 1): what an Azure diagram reaches for,
 * compute → networking → data → integration → identity → AI and monitoring.
 * The rest are reached by the stencil library's search or its "show all" view.
 * The length stays a multiple of the library grid's columns
 * (`STENCIL_LIBRARY_PANEL_GRID_COLUMNS` in canvas), so the section ends on a
 * full row.
 *
 * The labels are the products' official names, which Microsoft's icon terms
 * ask to be placed near the icon. Where one runs past 20 characters its leading
 * "Azure" is dropped (`Virtual Machines`), and nothing else is shortened. They
 * serve as both the stencil's tooltip and the label the placed shape carries.
 */
export const AZURE_TIER1_ICONS = [
	{ icon: "virtual-machine", label: "Virtual Machines" },
	{ icon: "vm-scale-sets", label: "Virtual Machine Scale Sets" },
	{ icon: "kubernetes-services", label: "Kubernetes Service" },
	{ icon: "container-apps-environments", label: "Azure Container Apps" },
	{ icon: "container-instances", label: "Container Instances" },
	{ icon: "container-registries", label: "Container Registry" },
	{ icon: "function-apps", label: "Azure Functions" },
	{ icon: "app-services", label: "Azure App Service" },
	{ icon: "static-apps", label: "Static Web Apps" },
	{ icon: "batch-accounts", label: "Azure Batch" },
	{ icon: "azure-virtual-desktop", label: "Virtual Desktop" },

	{ icon: "virtual-networks", label: "Virtual Network" },
	{ icon: "subnet", label: "Subnet" },
	{ icon: "network-security-groups", label: "Network Security Groups" },
	{ icon: "load-balancers", label: "Azure Load Balancer" },
	{ icon: "application-gateways", label: "Application Gateway" },
	{ icon: "front-door-and-cdn-profiles", label: "Azure Front Door" },
	{ icon: "firewalls", label: "Azure Firewall" },
	{ icon: "bastions", label: "Azure Bastion" },
	{ icon: "virtual-network-gateways", label: "Azure VPN Gateway" },
	{ icon: "expressroute-circuits", label: "Azure ExpressRoute" },
	{ icon: "dns-zones", label: "Azure DNS" },
	{ icon: "private-link", label: "Azure Private Link" },
	{ icon: "traffic-manager-profiles", label: "Traffic Manager" },
	{ icon: "public-ip-addresses", label: "Public IP Addresses" },

	{ icon: "storage-accounts", label: "Azure Storage" },
	{ icon: "blob-block", label: "Azure Blob Storage" },
	{ icon: "azure-fileshares", label: "Azure Files" },
	{ icon: "azure-cosmos-db", label: "Azure Cosmos DB" },
	{ icon: "sql-database", label: "Azure SQL Database" },
	{ icon: "sql-managed-instance", label: "SQL Managed Instance" },
	{
		icon: "azure-database-postgresql-server",
		label: "Database for PostgreSQL",
	},
	{ icon: "azure-database-mysql-server", label: "Database for MySQL" },
	{ icon: "cache-redis", label: "Cache for Redis" },

	{ icon: "api-management-services", label: "Azure API Management" },
	{ icon: "azure-service-bus", label: "Azure Service Bus" },
	{ icon: "event-hubs", label: "Azure Event Hubs" },
	{ icon: "event-grid-topics", label: "Azure Event Grid" },
	{ icon: "logic-apps", label: "Azure Logic Apps" },
	{ icon: "data-factories", label: "Azure Data Factory" },

	{ icon: "entra-id", label: "Microsoft Entra ID" },
	{ icon: "key-vaults", label: "Azure Key Vault" },
	{ icon: "managed-identities", label: "Managed Identities" },
	{
		icon: "microsoft-defender-for-cloud",
		label: "Microsoft Defender for Cloud",
	},
	{ icon: "azure-sentinel", label: "Microsoft Sentinel" },

	{ icon: "azure-openai", label: "Azure OpenAI" },
	{ icon: "ai-foundry", label: "Azure AI Foundry" },
	{ icon: "azure-synapse-analytics", label: "Synapse Analytics" },
	{ icon: "azure-databricks", label: "Azure Databricks" },
	{ icon: "application-insights", label: "Application Insights" },
	{ icon: "log-analytics-workspaces", label: "Log Analytics" },
	{ icon: "monitor", label: "Azure Monitor" },
	{ icon: "users", label: "Users" },
	{ icon: "resource-groups", label: "Resource Groups" },
] as const satisfies readonly IconSetPaletteEntry[];

/** The names of {@link AZURE_TIER1_ICONS} alone, in the same order. */
export const AZURE_TIER1_ICON_NAMES: readonly string[] = AZURE_TIER1_ICONS.map(
	(entry) => entry.icon,
);
