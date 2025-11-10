import {
  ChatMessage,
  estimateTokens,
  compressMessage,
} from "../utils/token-utils";

/**
 * 文章分块函数
 * @param content 文章内容
 * @param maxChunkSize 最大块大小
 * @returns 分块后的内容数组
 */
export const chunkArticle = (
  content: string,
  maxChunkSize = 2000
): string[] => {
  const chunks: string[] = [];
  const paragraphs = content.split(/\n\s*\n/); // 按段落分割

  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;

    // 如果当前块加上新段落超过限制，保存当前块并开始新块
    if (
      currentChunk &&
      currentChunk.length + trimmedParagraph.length + 2 > maxChunkSize
    ) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedParagraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmedParagraph;
    }
  }

  // 添加最后一个块
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

/**
 * 评估文章块的重要性
 * @param chunk 文章块内容
 * @param index 块在数组中的位置
 * @param totalChunks 总块数
 * @param userInput 用户输入（用于关键词匹配）
 * @returns 重要性分数 (0-1)
 */
export const evaluateChunkImportance = (
  chunk: string,
  index: number,
  totalChunks: number,
  userInput: string
): number => {
  let importance = 0;

  // 位置权重：开头和结尾更重要
  if (index === 0) importance += 0.3; // 开头
  if (index === totalChunks - 1) importance += 0.2; // 结尾

  // 长度权重：适中长度更重要
  const length = chunk.length;
  if (length > 500 && length < 2000) importance += 0.2;

  // 关键词匹配：与用户输入相关的内容更重要
  const userKeywords = userInput
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);
  const chunkLower = chunk.toLowerCase();
  let keywordMatches = 0;

  for (const keyword of userKeywords) {
    if (chunkLower.includes(keyword)) {
      keywordMatches++;
    }
  }

  importance += Math.min(keywordMatches * 0.1, 0.3);

  // 内容质量：包含标题、列表、代码等结构化内容
  if (/^#+\s/.test(chunk)) importance += 0.1; // 标题
  if (/^\s*[-*+]\s/m.test(chunk)) importance += 0.05; // 列表
  if (/```/.test(chunk)) importance += 0.1; // 代码块
  if (/\d+\./.test(chunk)) importance += 0.05; // 数字列表

  return Math.min(importance, 1.0);
};

/**
 * 智能管理文章内容
 * @param notePrompts 文章内容数组
 * @param maxArticleTokens 最大文章token数
 * @param userInput 用户输入
 * @returns 处理后的消息数组
 */
export const manageArticleContent = (
  notePrompts: string[],
  maxArticleTokens = 4000,
  userInput = ""
): ChatMessage[] => {
  if (!notePrompts?.length) return [];

  const messages: ChatMessage[] = [];
  let totalTokens = 0;

  // 处理每个文章
  for (const prompt of notePrompts) {
    const promptTokens = estimateTokens(prompt);

    // 如果单个文章就超过限制，需要分块处理
    if (promptTokens > maxArticleTokens) {
      const chunks = chunkArticle(prompt, 2000);

      // 评估每个块的重要性
      const chunksWithImportance = chunks.map((chunk, index) => ({
        chunk,
        importance: evaluateChunkImportance(
          chunk,
          index,
          chunks.length,
          userInput
        ),
        tokens: estimateTokens(chunk),
      }));

      // 按重要性排序
      chunksWithImportance.sort((a, b) => b.importance - a.importance);

      // 选择最重要的块，直到达到token限制
      let articleTokens = 0;
      const selectedChunks: string[] = [];

      for (const { chunk, tokens } of chunksWithImportance) {
        if (
          articleTokens + tokens <= maxArticleTokens &&
          totalTokens + articleTokens + tokens <= maxArticleTokens
        ) {
          selectedChunks.push(chunk);
          articleTokens += tokens;
        }
      }

      if (selectedChunks.length > 0) {
        const compressedContent =
          selectedChunks.length < chunks.length
            ? `[文章已智能压缩，保留了 ${selectedChunks.length}/${
                chunks.length
              } 个最相关的部分]\n\n${selectedChunks.join("\n\n---\n\n")}`
            : selectedChunks.join("\n\n");

        messages.push({
          role: "system",
          content: compressedContent,
        });

        totalTokens += articleTokens;
      }
    } else {
      // 文章不超过限制，直接添加
      if (totalTokens + promptTokens <= maxArticleTokens) {
        messages.push({
          role: "system",
          content: prompt,
        });
        totalTokens += promptTokens;
      } else {
        // 如果添加会超过总限制，进行压缩
        const remainingTokens = maxArticleTokens - totalTokens;
        if (remainingTokens > 500) {
          // 至少保留500个token才有意义
          const compressionRatio = remainingTokens / promptTokens;
          const compressedContent = compressMessage(
            prompt,
            Math.floor(prompt.length * compressionRatio)
          );

          messages.push({
            role: "user",
            content: compressedContent,
          });
          totalTokens += estimateTokens(compressedContent);
        }
      }
    }

    // 如果已经达到token限制，停止处理更多文章
    if (totalTokens >= maxArticleTokens) break;
  }

  return messages;
};
