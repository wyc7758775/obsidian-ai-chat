import OpenAI from "openai";
import { yoranChatSettings } from "src/main";

/**
 * @param settings : 配置的数据
 * @param inputValue : 输入框中的值
 * @param notePrompts : 当前需要作为上下文的文章集合
 * @param contextMessages : 对话累加的上下文
 * @param callBacks
 * @param cancelToken
 */
export interface OpenaiParams {
	settings: yoranChatSettings;
	inputValue: string;
	notePrompts?: string[];
	contextMessages?: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>;
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
	contextMessages,
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
		contextMessages,
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
	// 对话累加的上下文
	contextMessages?: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>,
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
				{ role: "system", content: settings.systemPrompt },
				...(contextMessages ?? []),
				{ role: "user", content: inputValue },
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
