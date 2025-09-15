import OpenAI from "openai";
import { yoranChatSettings } from "src/main";

export interface OpenaiParams {
	settings: yoranChatSettings;
	inputValue: string;
	notePrompts?: string[];
	callBacks: {
		onStart?: () => void;
		onChunk: (chunk: string) => void;
		onComplete?: () => void;
		onError?: (error: any) => void;
	};
	cancelToken?: { cancelled: boolean };
}

export async function getOpenai({
	settings,
	inputValue,
	notePrompts,
	callBacks,
	cancelToken,
}: OpenaiParams) {
	const openai = new OpenAI({
		apiKey: settings.appKey,
		baseURL: settings.apiBaseURL,
		dangerouslyAllowBrowser: true,
	});
	return handleSteamResponse(
		openai,
		settings,
		inputValue,
		callBacks,
		notePrompts,
		cancelToken
	);
}
export async function handleSteamResponse(
	openai: OpenAI,
	settings: yoranChatSettings,
	inputValue: string,
	callBacks: {
		onStart?: () => void;
		onChunk: (chunk: string) => void;
		onComplete?: () => void;
		onError?: (error: any) => void;
	},
	notePrompts?: string[],
	cancelToken?: { cancelled: boolean }
) {
	const notePromptsMessages = [];
	for (const message of notePrompts ?? []) {
		notePromptsMessages.push({
			role: "system",
			content: message,
		});
	}
	try {
		const stream = await openai.chat.completions.create({
			messages: [
				{ role: "user", content: inputValue },
				{ role: "system", content: settings.systemPrompt },
				...(notePromptsMessages as Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>),
			],
			model: settings.model,
			stream: true,
		});
		callBacks.onStart?.();
		for await (const part of stream) {
			if (cancelToken?.cancelled) {
				break;
			}
			const content = part.choices[0]?.delta?.content || "";
			if (content) {
				callBacks.onChunk(content);
			}
		}
		callBacks.onComplete?.();
	} catch (error) {
		console.error("OpenAI API error:", error);
		callBacks.onError?.(error);
	}
}
