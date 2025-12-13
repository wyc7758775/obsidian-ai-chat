import { useCallback, forwardRef } from "react";
import styles from "./css/styles.module.css";
import { HistoryItem, Message } from "../../type";
import { CloseIcon, CatEmptyIcon } from "../../../../ui/icon";

// TODO: i18n
export const useHistoryCard = ({
  onClickHistoryItem,
  onClickDelete,
}: {
  onClickHistoryItem: (item: HistoryItem) => void;
  onClickDelete: (item: HistoryItem) => void;
}) => {
  const clickHistoryItem = useCallback(
    (item: HistoryItem) => {
      onClickHistoryItem(item);
    },
    [onClickHistoryItem],
  );

  const handleDelete = useCallback(
    (item: HistoryItem) => {
      onClickDelete(item);
    },
    [onClickDelete],
  );

  const getPreviewData = useCallback((messages: HistoryItem["messages"]) => {
    const firstUser =
      messages.find((m: Message) => m?.type === "user")?.content || "";

    const firstAssistant =
      messages.find((m: Message) => m?.type === "assistant")?.content || "";

    return { question: firstUser, answer: firstAssistant };
  }, []);

  const HistoryCard = forwardRef<
    HTMLDivElement,
    {
      item: HistoryItem;
      index: number;
      isActive: boolean;
    }
  >(({ item, index, isActive }, ref) => {
    const isEmpty = !item.messages || item.messages.length === 0;

    const { question, answer } = getPreviewData(item.messages);
    return (
      <div
        ref={ref}
        className={`${styles.historyItemCard} ${
          isActive ? styles.historyItemCardActive : ""
        }`}
        key={index}
        onClick={() => clickHistoryItem(item)}
      >
        {isEmpty ? (
          <div className={styles.historyItemCardEmpty}>
            <div className={styles.emptyIcon}>
              <CatEmptyIcon />
            </div>
            <div className={styles.gameText}>No messages!</div>
            <div
              className={styles.historyItemCardActions}
              onClick={(e) => e.stopPropagation()}
            >
              <CloseIcon onClick={() => handleDelete(item)} />
            </div>
          </div>
        ) : (
          <>
            <div className={styles.historyItemCardTitle}>
              <span className={styles.roleBadge}>
                {item.roleName || "未设置角色"}
              </span>
            </div>
            <div className={styles.historyItemPreview}>
              <div className={styles.historyItemQuestion} title={question}>
                {question || "（暂无用户问题）"}
              </div>
              <div className={styles.historyItemAnswer} title={answer}>
                {answer || "（暂无 AI 回答）"}
              </div>
            </div>
            <div
              className={styles.historyItemCardActions}
              onClick={(e) => e.stopPropagation()}
            >
              <CloseIcon onClick={() => handleDelete(item)} />
            </div>
          </>
        )}
      </div>
    );
  });
  return {
    HistoryCard,
  };
};
