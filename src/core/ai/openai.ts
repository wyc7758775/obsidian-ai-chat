import OpenAI from "openai";
import { yoranChatSettings } from "src/main";
import { ChatMessage, formatErrorMessage } from "./utils/token-utils";
export { manageContextMessages } from "./managers/context-manager";
export { manageArticleContent } from "./managers/article-manager";

type CallBacks = {
  onStart?: () => void;
  onResponseStart?: () => void;
  onChunk: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
};

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
  messages: ChatMessage[];
  callBacks: CallBacks;
  cancelToken?: { cancelled: boolean };
  systemMessage?: string; // 自定义系统消息，优先级高于settings.systemPrompt
}

/**
 * 创建 OpenAI 客户端实例
 */
const createOpenAIClient = (settings: yoranChatSettings): OpenAI => {
  // 创建自定义的 fetch 函数来处理 CORS
  const customFetch = async (url: string, options: any) => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.appKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  };

  return new OpenAI({
    apiKey: settings.appKey,
    baseURL: settings.apiBaseURL || "https://ark.cn-beijing.volces.com/api/v3",
    dangerouslyAllowBrowser: true,
    fetch: customFetch,
  });
};

/**
 * 处理流式响应
 */
export const handleStreamResponse = async (
  openai: OpenAI,
  settings: yoranChatSettings,
  messages: ChatMessage[],
  callBacks: CallBacks,
  cancelToken?: { cancelled: boolean },
) => {
  try {
    const { maxContextTokens } = settings;
    callBacks.onStart?.();

    const stream = await openai.chat.completions.create({
      messages,
      model: settings.model,
      stream: true,
      temperature: 0.7,
      max_tokens: maxContextTokens,
    });
    callBacks.onResponseStart?.();

    for await (const part of stream) {
      if (cancelToken?.cancelled) {
        break;
      }

      const content = part.choices[0]?.delta?.content || "";
      if (content) {
        callBacks.onChunk(content);
      }
    }

    if (!cancelToken?.cancelled) {
      callBacks.onComplete?.();
    }
  } catch (error) {
    console.error("OpenAI API error:", error);

    const errorMessage = formatErrorMessage(error);
    callBacks.onError?.(new Error(errorMessage));
  }
};

/**
 * 验证 API 配置
 */
const validateAPIConfig = (settings: yoranChatSettings): string[] => {
  const errors: string[] = [];

  if (
    !settings.appKey ||
    settings.appKey.trim() === "" ||
    settings.appKey === "come on"
  ) {
    errors.push("请配置有效的 API Key");
  }

  if (!settings.apiBaseURL || settings.apiBaseURL.trim() === "") {
    errors.push("请配置 API Base URL");
  }

  if (!settings.model || settings.model.trim() === "") {
    errors.push("请选择 AI 模型");
  }

  return errors;
};

/**
 * 主要的 OpenAI API 调用函数
 */
export const streamChatCompletion = async ({
  settings,
  messages,
  callBacks,
  cancelToken,
}: OpenaiParams) => {
  const errorText = validateAPIConfig(settings);

  if (errorText && errorText.length) {
    for (const err of errorText) {
      callBacks.onError?.(new Error(err));
    }

    return;
  }

  const openai = createOpenAIClient(settings);

  return handleStreamResponse(
    openai,
    settings,
    messages,
    callBacks,
    cancelToken,
  );
};
