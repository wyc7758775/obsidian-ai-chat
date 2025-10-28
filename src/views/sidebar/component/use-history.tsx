import { App } from "obsidian";
import {
  AddIcon,
  ExpandIcon,
  FoldIcon,
  HistoryIcon,
  CloseIcon,
  EditIcon,
} from "./icon";
import styles from "../css/use-history.module.css";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { HistoryItem } from "../type";
import { useContext } from "../hooks/use-context";
import { EditHistoryModal } from "./edit-history-modal";

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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<HistoryItem | null>(null);
    const [editTitle, setEditTitle] = useState<string>("");
    const [editSystemMessage, setEditSystemMessage] = useState<string>("");
    
    // 瀑布流布局相关
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [containerHeight, setContainerHeight] = useState(0);

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
      setEditingItem(item);
      setEditTitle(item.title || item.messages?.[0]?.content || "新增AI对话");
      setEditSystemMessage(item.systemMessage || "");
      setIsModalOpen(true);
    };

    // 保存编辑
    const handleSaveEdit = async () => {
      if (!editingItem) return;

      try {
        const updatedItem: HistoryItem = {
          ...editingItem,
          title: editTitle,
          systemMessage: editSystemMessage,
        };
        await upsertHistoryItem(updatedItem);

        // 更新本地状态
        setHistoryList((prev) =>
          prev.map((historyItem) =>
            historyItem.id === editingItem.id ? updatedItem : historyItem
          )
        );

        // 关闭弹窗并重置状态
        setIsModalOpen(false);
        setEditingItem(null);
        setEditTitle("");
        setEditSystemMessage("");
      } catch (e) {
        console.error("保存编辑失败:", e);
      }
    };

    // 取消编辑
    const handleCancelEdit = () => {
      setIsModalOpen(false);
      setEditingItem(null);
      setEditTitle("");
      setEditSystemMessage("");
    };

    const historyItemRender = (item: HistoryItem, index: number) => {
      const isActive = item.id === currentId;

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

    // 瀑布流布局计算
    const calculateWaterfallLayout = () => {
      if (!containerRef.current || !isExpanded) return;
      
      const container = containerRef.current;
      const containerWidth = container.clientWidth - 32; // 对应CSS中的左边距20px + 右边距12px
      const cardWidth = 180;
      const gap = 12; // 适中的间距，保持美观
      const columns = Math.max(1, Math.floor((containerWidth + gap) / (cardWidth + gap)));
      const actualCardWidth = (containerWidth - gap * (columns - 1)) / columns;
      
      const columnHeights = new Array(columns).fill(0);
      
      cardRefs.current.forEach((cardEl, index) => {
        if (!cardEl) return;
        
        // 找到最短的列
        const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
        
        // 设置卡片位置和宽度
        const left = shortestColumnIndex * (actualCardWidth + gap) + 20; // 加上左边距
        const top = columnHeights[shortestColumnIndex] + 24; // 加上容器的padding-top
        
        cardEl.style.left = `${left}px`;
        cardEl.style.top = `${top}px`;
        cardEl.style.width = `${actualCardWidth}px`;
        
        // 更新列高度
        columnHeights[shortestColumnIndex] += cardEl.offsetHeight + gap;
      });
      
      // 设置容器高度
      const maxHeight = Math.max(...columnHeights);
      setContainerHeight(maxHeight); // 简单设置高度，让CSS处理滚动空间
    };

    // 监听布局变化
    useLayoutEffect(() => {
      calculateWaterfallLayout();
    }, [historyList, isExpanded]);

    useEffect(() => {
      if (isExpanded) {
        const resizeObserver = new ResizeObserver(() => {
          calculateWaterfallLayout();
        });
        
        if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
        }
        
        return () => resizeObserver.disconnect();
      }
    }, [isExpanded]);

    // 历史记录 item 卡片样式
    const historyItemCardRender = (item: HistoryItem, index: number) => {
      const isActive = item.id === currentId;

      const handleEditClick = () => {
        handleStartEdit(item);
      };

      const handleDeleteClick = () => {
        handleDelete(item.id);
      };

      return (
        <div
          ref={(el) => (cardRefs.current[index] = el)}
          className={`${styles.historyItemCard} ${
            isActive ? styles.historyItemCardActive : ""
          }`}
          key={index}
          onClick={() => handleUpdateHistoryItem(item)}
        >
          <div className={styles.historyItemCardTitle}>
            {item.title || item.messages?.[0]?.content || "新增AI对话"}
          </div>
          <div
            className={styles.historyItemCardActions}
            onClick={(e) => e.stopPropagation()}
          >
            <EditIcon onClick={handleEditClick} />
            <CloseIcon onClick={handleDeleteClick} />
          </div>
        </div>
      );
    };

    return (
      <>
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
            <>
              <div 
                ref={containerRef}
                className={styles.historyExpandList}
                style={{ 
                  height: containerHeight > 0 ? `${containerHeight + 30}px` : '30vh',
                  minHeight: '200px',
                  maxHeight: '50vh' // 恢复最大高度限制，防止过高
                }}
              >
                {historyList.map((item: HistoryItem, index: number) =>
                  historyItemCardRender(item, index)
                )}
              </div>
              <div className={styles.historyFoldAction}>
                <FoldIcon onClick={handleFold} />
              </div>
            </>
          )}
        </div>

        {/* 编辑历史记录弹窗 */}
        <EditHistoryModal
          isOpen={isModalOpen}
          historyItem={editingItem}
          editTitle={editTitle}
          editSystemMessage={editSystemMessage}
          onTitleChange={setEditTitle}
          onSystemMessageChange={setEditSystemMessage}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      </>
    );
  };
  return {
    historyRender,
    historyItems,
    currentId,
  };
};
