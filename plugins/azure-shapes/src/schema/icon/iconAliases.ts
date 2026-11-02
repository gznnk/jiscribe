/**
 * Hand-written table from the short names an Azure diagram is talked about in
 * (`vm`, `aks`, `vnet`) to canonical ones. No mechanical rule reaches them.
 *
 * Spellings that already resolve are left out: a canonical name, and the name
 * with `azure-` / `microsoft-` dropped (`service-bus`, `openai`), which
 * azureIconCatalog derives. A test holds every target to an icon that exists
 * and every alias to a spelling that would not resolve without it.
 *
 * The Entra spellings (`entra`, `aad`, `azure-ad`) reach Microsoft Entra ID,
 * which comes from Entra's own icon package; `entra-id-governance` and
 * `entra-workload-id` reach the Azure icons Entra's package draws the same.
 */
export const AZURE_ICON_ALIASES: Readonly<Record<string, string>> = {
	aad: "entra-id",
	aca: "container-apps-environments",
	aci: "container-instances",
	acr: "container-registries",
	adf: "data-factories",
	afd: "front-door-and-cdn-profiles",
	agw: "application-gateways",
	aks: "kubernetes-services",
	aoai: "azure-openai",
	apim: "api-management-services",
	"app-insights": "application-insights",
	"app-service": "app-services",
	"azure-active-directory": "entra-id",
	"azure-ad": "entra-id",
	bastion: "bastions",
	blob: "blob-block",
	"container-apps": "container-apps-environments",
	cosmos: "azure-cosmos-db",
	defender: "microsoft-defender-for-cloud",
	dns: "dns-zones",
	entra: "entra-id",
	"entra-id-governance": "identity-governance",
	"entra-workload-id": "app-registrations",
	"event-grid": "event-grid-topics",
	"event-hub": "event-hubs",
	expressroute: "expressroute-circuits",
	firewall: "firewalls",
	"front-door": "front-door-and-cdn-profiles",
	func: "function-apps",
	functions: "function-apps",
	"key-vault": "key-vaults",
	kv: "key-vaults",
	lb: "load-balancers",
	"log-analytics": "log-analytics-workspaces",
	"managed-identity": "managed-identities",
	"nat-gateway": "nat",
	nsg: "network-security-groups",
	"private-endpoint": "private-endpoints",
	"public-ip": "public-ip-addresses",
	redis: "cache-redis",
	rg: "resource-groups",
	"sql-db": "sql-database",
	"sql-mi": "sql-managed-instance",
	"static-web-app": "static-apps",
	storage: "storage-accounts",
	synapse: "azure-synapse-analytics",
	vm: "virtual-machine",
	vmss: "vm-scale-sets",
	vnet: "virtual-networks",
	"vpn-gateway": "virtual-network-gateways",
	webapp: "app-services",
};
