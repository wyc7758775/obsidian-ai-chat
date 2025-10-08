import { App } from "obsidian";
import { AddIcon, ExpandIcon, FoldIcon, HistoryIcon, CloseIcon } from "./icon";
import { useState, useEffect } from "react";
import { HistoryItem } from "../type";
import { useContext } from "../hooks/use-context";

export type ChatMessageProps = {
  app: App;
};
export const useHistory = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItem>(
    {} as HistoryItem
  );
  const [currentId, setCurrentId] = useState<string>("");

  const {
    addEmptyItem,
    fetchHistoryList,
    deleteEmptyItems,
    getHistoryItemById,
    deleteHistoryItem,
  } = useContext();

  const historyRender: React.FC<ChatMessageProps> = ({ app }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [historyList, setHistoryList] = useState<HistoryItem[]>([]);

    const handleExpand = () => {
      setIsExpanded(true);
    };

    const handleFold = () => {
      setIsExpanded(false);
    };
    const handleAdd = async () => {
      const item = await addEmptyItem();
      (async () => {
        try {
          const historyItem = (await getHistoryItemById(item.id)) ?? {
            id: item.id,
            messages: [],
          };
          setHistoryList((prev) => [historyItem, ...prev]);
          setCurrentId(item.id);
        } catch (e) {
          console.error("IndexedDB load failed:", e);
        }
      })();
    };

    useEffect(() => {
      (async () => {
        try {
          const items = await fetchHistoryList();
          setHistoryList(items);
          setCurrentId(items[0]?.id || "");
        } catch (e) {
          console.error("IndexedDB load failed:", e);
        }
      })();
    }, [fetchHistoryList]);

    const handleUpdateHistoryItem = (item: HistoryItem) => {
      setCurrentId(item.id);
      setHistoryItems(item);
    };

    // TODO: 新建对话和其他元素切换之后，message 会出现问题
    const historyItemRender = (item: HistoryItem, index: number) => {
      const isActive = item.id === currentId;
      return (
        <div
          className={`yoran-history__fold-item ${
            isActive ? " yoran-history__fold-item--active" : ""
          }`}
          key={index}
          onClick={() => handleUpdateHistoryItem(item)}
        >
          <div className="yoran-history__fold-icon">
            <HistoryIcon />
          </div>
          <div className="yoran-history__fold-text">
            {item.messages?.[0]?.content ?? "新增对话"}
          </div>
          <div
            className="yoran-history__fold-delete"
            onClick={() => deleteHistoryItem(item.id)}
          >
            <CloseIcon />
          </div>
        </div>
      );
    };

    // 组件销毁时，删除空的历史记录
    useEffect(() => {
      return () => {
        deleteEmptyItems();
      };
    }, []);

    return (
      <div className="yoran-history">
        {/*  收起容器 */}
        {!isExpanded && (
          <div className="yoran-history__fold">
            <div className="yoran-history__fold-add">
              <AddIcon onClick={handleAdd} />
            </div>
            <div className="yoran-history__fold-list">
              {historyList.map((item: HistoryItem, index: number) =>
                historyItemRender(item, index)
              )}
            </div>
            <div className="yoran-history__fold-expand">
              <ExpandIcon onClick={handleExpand} />
            </div>
          </div>
        )}
        {/* 展开容器 */}
        {isExpanded && (
          <div className="yoran-history__expand">
            <div className="yoran-history__expand-list">
              {historyList.map((item: HistoryItem, index: number) =>
                historyItemRender(item, index)
              )}
            </div>
            <div className="yoran-history__fold-action">
              <FoldIcon onClick={handleFold} />
            </div>
          </div>
        )}
      </div>
    );
  };
  return {
    historyRender,
    historyItems,
    currentId,
  };
};
