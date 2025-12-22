import type { AiData } from "../../../types/data/diagrams/AiData";
import { AiFeatures } from "../../../types/data/diagrams/AiData";
import { CreateDefaultData } from "../shapes/CreateDefaultData";

/**
 * Default data values for Ai
 */
export const AiDefaultData: AiData = CreateDefaultData<AiData>({
	type: "Ai",
	options: AiFeatures,
	properties: {
		avatarUrl:
			"https://iconbu.com/wp-content/uploads/2022/06/%E3%81%A8%E3%81%91%E3%81%A1%E3%82%83%E3%81%86%E7%8C%AB%E3%81%95%E3%82%93.png",
		// "https://media.istockphoto.com/id/1973365581/ja/%E3%83%99%E3%82%AF%E3%82%BF%E3%83%BC/%E3%82%B5%E3%83%B3%E3%83%97%E3%83%AB%E3%82%A4%E3%83%B3%E3%82%AF%E3%82%B4%E3%83%A0%E3%82%B9%E3%82%BF%E3%83%B3%E3%83%97.jpg?s=1024x1024&w=is&k=20&c=xaYjkMHb5r2hSceKq_M44FhqdAPHQkorn1IuKtS8Yjo=",
		avatarBgColor: "#4A90E2",
		bubbleBgColor: "#F0F0F0",
		aiMessage: "Hello! How can I help you today?",
	},
});
