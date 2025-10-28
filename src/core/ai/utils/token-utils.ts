import OpenAI from "openai";

export type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/**
 * 估算文本的 token 数量（粗略估算）
 * 1 token ≈ 4 个字符（对于英文），中文可能更少
 */
export const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 3); // 保守估算，中文字符占用更多 token
};

/**
 * 估算消息的 token 数量
 */
export const estimateMessageTokens = (message: ChatMessage): number => {
  const content = typeof message.content === "string" ? message.content : "";
  return estimateTokens(content) + 10; // 额外的 10 个 token 用于消息结构
};

/**
 * 智能压缩长消息
 * @param content 原始内容
 * @param maxLength 最大长度
 * @returns 压缩后的内容
 */
export const compressMessage = (content: string, maxLength: number): string => {
  if (content.length <= maxLength) return content;

  // 保留开头和结尾，压缩中间部分
  const startLength = Math.floor(maxLength * 0.4);
  const endLength = Math.floor(maxLength * 0.4);
  const start = content.substring(0, startLength);
  const end = content.substring(content.length - endLength);

  return `${start}\n\n[... 内容已压缩，省略 ${
    content.length - maxLength
  } 个字符 ...]\n\n${end}`;
};

/**
 * 处理和格式化错误信息
 */
export const formatErrorMessage = (error: unknown): string => {
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