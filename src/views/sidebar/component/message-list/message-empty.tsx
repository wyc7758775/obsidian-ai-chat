import { AddSmallIcon } from "../icon";
import { CatLogo } from "./cat-logo";
import styles from "../../css/message-list.module.css";

export const messageEmptyRender = (
  suggestions?: string[],
  onInsertSuggestion?: (text: string) => void
) => {
  const defaultSuggestions: string[] = [
    "请帮我总结这篇笔记的重点并给出行动项",
    "把这段文字润色为更流畅、自然的中文",
    "为这篇文章生成一个结构化大纲（含章节与要点）",
    "指出内容的逻辑问题并给出改进建议",
  ];

  const suggestionsList: string[] =
    Array.isArray(suggestions) && suggestions.length > 0
      ? suggestions.slice(0, 10)
      : defaultSuggestions;

  return (
    <div className={styles.emptyWrap}>
      <CatLogo />
      <div className={styles.suggestionsWrap} aria-label="建议提示">
        {suggestionsList.map((text: string, idx: number) => (
          <div className={styles.suggestionItem} key={idx}>
            <span className={styles.suggestionText}>{text}</span>
            <AddSmallIcon onClick={() => onInsertSuggestion?.(text)} />
          </div>
        ))}
      </div>
    </div>
  );
};
