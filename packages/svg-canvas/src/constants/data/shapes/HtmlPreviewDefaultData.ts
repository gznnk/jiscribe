import { CreateDefaultData } from "./CreateDefaultData";
import type { HtmlPreviewData } from "../../../types/data/shapes/HtmlPreviewData";
import { HtmlPreviewFeatures } from "../../../types/data/shapes/HtmlPreviewData";

/**
 * Default HtmlPreview data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const HtmlPreviewDefaultData = CreateDefaultData<HtmlPreviewData>({
	type: "HtmlPreview",
	options: HtmlPreviewFeatures,
	properties: {
		width: 300,
		height: 200,
		htmlContent: `<div style="padding: 10px; font-family: Arial, sans-serif;">
  <h2 style="color: #4A90E2; margin-top: 0;">HTML Preview</h2>
  <p>This is a <strong>live HTML preview</strong> component.</p>
  <ul>
    <li>Supports HTML rendering</li>
    <li>DOMPurify sanitization</li>
    <li>Fully interactive</li>
  </ul>
  <div style="background: #f0f0f0; padding: 8px; border-radius: 4px; margin-top: 10px;">
    <code>Edit htmlContent property to customize</code>
  </div>
</div>`,
	},
});
