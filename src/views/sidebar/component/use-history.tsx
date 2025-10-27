import { App } from "obsidian";
import { AddIcon, ExpandIcon, FoldIcon, HistoryIcon, CloseIcon, EditIcon, SaveIcon, CancelIcon } from "./icon";
import styles from "../css/use-history.module.css";
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
    getHistoryItemById,
    deleteHistoryItem,
    upsertHistoryItem,
  } = useContext();

  const historyRender: React.FC<ChatMessageProps> = ({ app }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState<string>("");
    const [editSystemMessage, setEditSystemMessage] = useState<string>("");

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

    const handleDelete = async (id: string) => {
      // 如果删除前只有一条记录，先创建一条新记录
      if (historyList.length === 1) {
        const newItem = await addEmptyItem();
        try {
          const historyItem = (await getHistoryItemById(newItem.id)) ?? {
            id: newItem.id,
            messages: [],
          };
          setHistoryList([historyItem]);
          setCurrentId(newItem.id);
          // 创建新记录后再删除原记录
          await deleteHistoryItem(id);
        } catch (e) {
          console.error("创建新历史记录失败:", e);
        }
      } else {
        // 如果有多条记录，正常删除
        await deleteHistoryItem(id);
        const items = await fetchHistoryList();
        setHistoryList(items);

        if (id === currentId) {
          // 如果删除的是当前项，切换到第一条
          setCurrentId(items[0]?.id || "");
        }
      }
    };

    const handleUpdateHistoryItem = (item: HistoryItem) => {
      setCurrentId(item.id);
      setHistoryItems(item);
    };

    // 开始编辑
    const handleStartEdit = (item: HistoryItem, e?: React.MouseEvent) => {
      e?.stopPropagation(); // 防止触发选择历史记录
      setEditingId(item.id);
      setEditTitle(item.title || item.messages?.[0]?.content || "新增AI对话");
      setEditSystemMessage(item.systemMessage || "");
    };

    // 保存编辑
    const handleSaveEdit = async (item: HistoryItem, e?: React.MouseEvent) => {
      e?.stopPropagation();
      try {
        const updatedItem: HistoryItem = {
          ...item,
          title: editTitle,
          systemMessage: editSystemMessage,
        };
        await upsertHistoryItem(updatedItem);
        
        // 更新本地状态
        setHistoryList(prev => 
          prev.map(historyItem => 
            historyItem.id === item.id ? updatedItem : historyItem
          )
        );
        
        setEditingId(null);
        setEditTitle("");
        setEditSystemMessage("");
      } catch (e) {
        console.error("保存编辑失败:", e);
      }
    };

    // 取消编辑
    const handleCancelEdit = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setEditingId(null);
      setEditTitle("");
      setEditSystemMessage("");
    };

    const historyItemRender = (item: HistoryItem, index: number) => {
      const isActive = item.id === currentId;
      const isEditing = editingId === item.id;
      
      if (isEditing) {
        return (
          <div
            className={`${styles.historyFoldItem} ${
              isActive ? styles.historyFoldItemActive : ""
            }`}
            key={index}
          >
            <div className={styles.historyEditForm}>
              <div className={styles.historyEditField}>
                <label>标题:</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="历史记录标题"
                  className={styles.historyEditInput}
                />
              </div>
              <div className={styles.historyEditField}>
                <label>AI系统信息:</label>
                <textarea
                  value={editSystemMessage}
                  onChange={(e) => setEditSystemMessage(e.target.value)}
                  placeholder="AI系统提示信息"
                  className={styles.historyEditTextarea}
                  rows={3}
                />
              </div>
              <div className={styles.historyEditActions}>
                 <SaveIcon onClick={() => handleSaveEdit(item)} />
                 <CancelIcon onClick={() => handleCancelEdit()} />
               </div>
            </div>
          </div>
        );
      }

      return (
        <div
          className={`${styles.historyFoldItem} ${
            isActive ? styles.historyFoldItemActive : ""
          }`}
          key={index}
          onClick={() => handleUpdateHistoryItem(item)}
        >
          <div className={styles.historyFoldIcon}>
            <HistoryIcon />
          </div>
          <div className={styles.historyFoldText}>
            {item.title || item.messages?.[0]?.content || "新增AI对话"}
          </div>
          <div className={styles.historyFoldActions}>
             <EditIcon onClick={() => handleStartEdit(item)} />
             <CloseIcon onClick={() => handleDelete(item.id)} />
           </div>
        </div>
      );
    };

    return (
      <div className={styles.history}>
        {/*  收起容器 */}
        {!isExpanded && (
          <div className={styles.historyFold}>
            <div className={styles.historyFoldAdd}>
              <AddIcon onClick={handleAdd} />
            </div>
            <div className={styles.historyFoldList}>
              {historyList.map((item: HistoryItem, index: number) =>
                historyItemRender(item, index)
              )}
            </div>
            <div className={styles.historyFoldExpand}>
              <ExpandIcon onClick={handleExpand} />
            </div>
          </div>
        )}
        {/* 展开容器 */}
        {isExpanded && (
          <div className={styles.historyExpand}>
            <div className={styles.historyExpandList}>
              {historyList.map((item: HistoryItem, index: number) =>
                historyItemRender(item, index)
              )}
            </div>
            <div className={styles.historyFoldAction}>
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
