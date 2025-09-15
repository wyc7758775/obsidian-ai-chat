import OpenAI from "openai";
import { yoranChatSettings } from "src/main";

// const TEMPLATE_ENDPOINT_ID = "kimi-k2-250711";
// const TEMPLATE_API_KEY = "a156c7ff-ab38-4d8f-8d28-1a33957da543";
// const TEMPLATE_base_url = "https://ark.cn-beijing.volces.com/api/v3";

export async function getOpenai(
	settings: yoranChatSettings,
	onChunk: (chunk: string) => void
) {
	const openai = new OpenAI({
		apiKey: settings.appKey,
		baseURL: settings.apiBaseURL,
		dangerouslyAllowBrowser: true,
	});
	return main(openai, settings, onChunk);
}
export async function main(
	openai: OpenAI,
	settings: yoranChatSettings,
	onChunk: (chunk: string) => void
) {
	const stream = await openai.chat.completions.create({
		messages: [
			{ role: "system", content: "你是人工智能助手" },
			{ role: "user", content: "你可以帮助我做什么？" },
		],
		model: settings.model,
		stream: true,
	});

	for await (const part of stream) {
		const content = part.choices[0]?.delta?.content || "";
		onChunk(content);
	}
}
