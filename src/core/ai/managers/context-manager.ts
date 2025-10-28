import { ChatMessage, estimateMessageTokens, estimateTokens, compressMessage } from "../utils/token-utils";

/**
 * 自适应策略配置
 */
interface AdaptiveStrategy {
  recentMessageCount: number;
  compressionThreshold: number;
  importanceThreshold: number;
  maxCompressionRatio: number;
}

/**
 * 评估消息的重要性分数
 * @param message 消息对象
 * @param index 消息在数组中的位置
 * @param totalMessages 总消息数
 * @returns 重要性分数 (0-1)
 */
export const evaluateMessageImportance = (
  message: ChatMessage,
  index: number,
  totalMessages: number
): number => {
  const content = typeof message.content === "string" ? message.content : "";
  let score = 0;

  // 1. 位置权重：最新的消息更重要
  const positionWeight = (index + 1) / totalMessages;
  score += positionWeight * 0.4;

  // 2. 长度权重：适中长度的消息更重要（避免过短或过长）
  const length = content.length;
  const lengthWeight = length > 50 && length < 2000 ? 0.3 : 0.1;
  score += lengthWeight;

  // 3. 角色权重：用户消息和助手回复都很重要
  const roleWeight =
    message.role === "user" || message.role === "assistant" ? 0.2 : 0.1;
  score += roleWeight;

  // 4. 内容质量权重：包含问题、关键词的消息更重要
  const hasQuestion = /[？?]/.test(content);
  const hasKeywords = /\b(如何|怎么|什么|为什么|分析|总结|解释|帮助)\b/.test(
    content
  );
  const contentQualityWeight =
    (hasQuestion ? 0.05 : 0) + (hasKeywords ? 0.05 : 0);
  score += contentQualityWeight;

  return Math.min(score, 1); // 确保分数不超过1
};

/**
 * 根据对话深度动态调整策略参数
 * @param messageCount 消息总数
 * @param hasArticleContent 是否有文章内容
 * @returns 调整后的策略参数
 */
export const getAdaptiveStrategy = (
  messageCount: number,
  hasArticleContent = false
): AdaptiveStrategy => {
  // 基础策略
  let baseStrategy: AdaptiveStrategy;

  if (messageCount <= 10) {
    // 短对话：保留所有消息，不压缩
    baseStrategy = {
      recentMessageCount: messageCount,
      compressionThreshold: 0.95, // 几乎不压缩
      importanceThreshold: 0.3, // 较低的重要性阈值
      maxCompressionRatio: 0.9, // 最多压缩10%
    };
  } else if (messageCount <= 30) {
    // 中等对话：适度管理
    baseStrategy = {
      recentMessageCount: 8,
      compressionThreshold: 0.8,
      importanceThreshold: 0.5,
      maxCompressionRatio: 0.7,
    };
  } else {
    // 长对话：积极管理
    baseStrategy = {
      recentMessageCount: 6,
      compressionThreshold: 0.7,
      importanceThreshold: 0.6,
      maxCompressionRatio: 0.5,
    };
  }

  // 如果有文章内容，调整策略以节省更多空间给文章
  if (hasArticleContent) {
    return {
      recentMessageCount: Math.max(
        2,
        Math.floor(baseStrategy.recentMessageCount * 0.6)
      ), // 减少保留的最近消息
      compressionThreshold: baseStrategy.compressionThreshold * 0.7, // 更早开始压缩
      importanceThreshold: baseStrategy.importanceThreshold + 0.2, // 提高重要性阈值
      maxCompressionRatio: baseStrategy.maxCompressionRatio * 0.8, // 更激进的压缩
    };
  }

  return baseStrategy;
};

/**
 * 智能上下文管理策略
 * @param contextMessages 原始上下文消息
 * @param maxContextTokens 最大上下文 token 数
 * @param hasArticleContent 是否有文章内容
 * @returns 优化后的上下文消息
 */
export const manageContextMessages = (
  contextMessages: Array<ChatMessage>,
  maxContextTokens = 8000,
  hasArticleContent = false
): Array<ChatMessage> => {
  if (!contextMessages?.length) return [];

  // 0. 根据对话深度获取自适应策略
  const strategy = getAdaptiveStrategy(
    contextMessages.length,
    hasArticleContent
  );

  // 1. 评估每条消息的重要性
  const messagesWithScore = contextMessages.map((message, index) => ({
    message,
    score: evaluateMessageImportance(message, index, contextMessages.length),
    tokens: estimateMessageTokens(message),
    index,
  }));

  // 2. 按重要性排序，但保持最新消息的优先级
  const recentMessages = messagesWithScore.slice(-strategy.recentMessageCount);
  const olderMessages = messagesWithScore
    .slice(0, -strategy.recentMessageCount)
    .sort((a, b) => b.score - a.score);

  // 3. 智能选择和压缩消息
  const selectedMessages: Array<ChatMessage> = [];
  let totalTokens = 0;

  // 首先添加最近的消息（保证对话连贯性）
  for (const item of recentMessages) {
    if (
      totalTokens + item.tokens <=
      maxContextTokens * strategy.compressionThreshold
    ) {
      selectedMessages.push(item.message);
      totalTokens += item.tokens;
    } else {
      // 如果消息太长，尝试压缩
      const content =
        typeof item.message.content === "string" ? item.message.content : "";
      const availableTokens = maxContextTokens - totalTokens;
      const maxLength = Math.max(100, availableTokens * 3); // 转换为字符数

      if (maxLength > 100) {
        const targetLength = Math.floor(
          content.length * strategy.maxCompressionRatio
        );
        const compressedContent = compressMessage(
          content,
          Math.min(maxLength, targetLength)
        );
        selectedMessages.push({
          ...item.message,
          content: compressedContent,
        });
        totalTokens += estimateTokens(compressedContent) + 10;
      }
      break;
    }
  }

  // 然后添加重要的历史消息
  for (const item of olderMessages) {
    if (totalTokens + item.tokens <= maxContextTokens) {
      selectedMessages.splice(-recentMessages.length, 0, item.message); // 插入到最近消息之前
      totalTokens += item.tokens;
    } else {
      // 尝试压缩重要的历史消息
      const content =
        typeof item.message.content === "string" ? item.message.content : "";
      const availableTokens = maxContextTokens - totalTokens;
      const maxLength = Math.max(200, availableTokens * 3);

      if (maxLength > 200 && item.score > strategy.importanceThreshold) {
        // 使用自适应重要性阈值
        const targetLength = Math.floor(
          content.length * strategy.maxCompressionRatio
        );
        const compressedContent = compressMessage(
          content,
          Math.min(maxLength, targetLength)
        );
        selectedMessages.splice(-recentMessages.length, 0, {
          ...item.message,
          content: compressedContent,
        });
        totalTokens += estimateTokens(compressedContent) + 10;
      }

      if (totalTokens >= maxContextTokens * strategy.compressionThreshold)
        break; // 使用自适应阈值
    }
  }

  // 4. 按原始顺序重新排序
  const finalMessages = selectedMessages.sort((a, b) => {
    const aIndex = contextMessages.findIndex(
      (msg) =>
        msg === a ||
        (typeof msg.content === "string" &&
          typeof a.content === "string" &&
          msg.content.includes(a.content.substring(0, 50)))
    );
    const bIndex = contextMessages.findIndex(
      (msg) =>
        msg === b ||
        (typeof msg.content === "string" &&
          typeof b.content === "string" &&
          msg.content.includes(b.content.substring(0, 50)))
    );
    return aIndex - bIndex;
  });

  // 确保至少保留最后一轮对话
  if (finalMessages.length === 0 && contextMessages.length > 0) {
    finalMessages.push(contextMessages[contextMessages.length - 1]);
  }

  return finalMessages;
};