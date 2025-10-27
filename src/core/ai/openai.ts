import OpenAI from "openai";
import { yoranChatSettings } from "src/main";

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

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
  inputValue: string;
  notePrompts?: string[];
  contextMessages?: Array<ChatMessage>;
  callBacks: CallBacks;
  cancelToken?: { cancelled: boolean };
  systemMessage?: string; // 自定义系统消息，优先级高于settings.systemPrompt
}

/**
 * 构建消息数组
 * 将系统提示、笔记上下文、历史对话和用户输入组合成完整的消息数组
 */
const buildMessages = (
  settings: yoranChatSettings,
  inputValue: string,
  notePrompts?: string[],
  contextMessages?: Array<ChatMessage>,
  systemMessage?: string,
): ChatMessage[] => {
  const messages: ChatMessage[] = [];

  // 添加系统提示（优先使用自定义系统消息）
  const finalSystemMessage = systemMessage || settings.systemPrompt;
  if (finalSystemMessage) {
    messages.push({
      role: "system",
      content: finalSystemMessage,
    });
  }

  // 添加笔记上下文
  if (notePrompts?.length) {
    notePrompts.forEach((prompt) => {
      messages.push({
        role: "system",
        content: prompt,
      });
    });
  }

  // 添加历史对话
  if (contextMessages?.length) {
    messages.push(...contextMessages);
  }

  // 添加用户输入
  messages.push({
    role: "user",
    content: inputValue,
  });

  return messages;
};

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
 * 处理和格式化错误信息
 */
const formatErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "API 请求失败";
  }

  const message = error.message.toLowerCase();

  if (message.includes("cors")) {
    return "跨域请求被阻止，请检查 API 配置";
  }

  if (message.includes("401") || message.includes("unauthorized")) {
    return "API Key 无效或已过期";
  }

  if (message.includes("429") || message.includes("rate limit")) {
    return "请求频率过高，请稍后重试";
  }

  if (message.includes("timeout") || message.includes("etimedout")) {
    return "请求超时，请检查网络连接";
  }

  if (message.includes("network") || message.includes("fetch")) {
    return "网络连接失败，请检查网络状态";
  }

  if (message.includes("400") || message.includes("bad request")) {
    return "请求参数错误，请检查配置";
  }

  if (message.includes("500") || message.includes("internal server")) {
    return "服务器内部错误，请稍后重试";
  }

  // 返回原始错误信息作为后备
  return error.message || "未知错误";
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
    callBacks.onStart?.();

    const stream = await openai.chat.completions.create({
      messages,
      model: settings.model,
      stream: true,
      temperature: 0.7,
      max_tokens: 4000,
    });
    callBacks.onResponseStart?.();

    for await (const part of stream) {
      if (cancelToken?.cancelled) {
        console.log("Stream cancelled by user");
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
export const sendChatMessage = async ({
  settings,
  inputValue,
  notePrompts,
  contextMessages,
  callBacks,
  cancelToken,
  systemMessage,
}: OpenaiParams) => {
  const errorText = validateAPIConfig(settings);
  if (errorText && errorText.length) {
    for (const err of errorText) {
      callBacks.onError?.(new Error(err));
    }
    return;
  }
  const openai = createOpenAIClient(settings);
  // 使用 buildMessages 函数构建消息数组
  const messages = buildMessages(
    settings,
    inputValue,
    notePrompts,
    contextMessages,
    systemMessage,
  );

  return handleStreamResponse(
    openai,
    settings,
    messages,
    callBacks,
    cancelToken,
  );
};
