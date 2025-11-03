import { App, Notice } from "obsidian";
import { useState, useEffect, useRef } from "react";
import {
  AddChatIcon,
  CloseIcon,
  HistoryExpandIcon,
  CatEmptyIcon,
  RoleExpandIcon,
} from "../icon";
import styles from "./css/styles.module.css";
import { HistoryItem } from "../../type";
import { useContext } from "../../hooks/use-context";
import { debounce } from "../../../../utils";
import { RoleModal, useRoles } from "./roles";
import { useWaterfallLayout } from "./use-waterfall-layout";

export type ChatMessageProps = {
  app: App;
};

export const useHistory = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItem>(
    {} as HistoryItem
  );
  const [currentId, setCurrentId] = useState<string>("");
  // 用于强制刷新历史记录列表的触发器
  const [updater, setUpdater] = useState(0);

  /**
   * 强制刷新历史记录列表
   */
  const forceHistoryUpdate = () => {
    setUpdater((u) => u + 1);
  };

  const historyRender: React.FC<ChatMessageProps> = ({ app }) => {
    const {
      addEmptyItem,
      fetchHistoryList,
      getHistoryItemById,
      deleteHistoryItem,
      getDefaultRole,
      upsertHistoryItem,
    } = useContext(app);
    const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
    const [showHistoryAndRoles, setShowHistoryAndRoles] = useState<
      "history" | "roles" | null
    >(null);

    const handleExpand = () => {
      if (showHistoryAndRoles === "roles") {
        setShowHistoryAndRoles(null);
      } else {
        setShowHistoryAndRoles("roles");
      }
    };

    const handleHistoryExpand = () => {
      if (showHistoryAndRoles === "history") {
        setShowHistoryAndRoles(null);
      } else {
        setShowHistoryAndRoles("history");
      }
    };

    const {
      renderRoleList,
      selectedRole,
      setSelectedRole,
      isRoleModalOpen,
      roleNameInput,
      setRoleNameInput,
      rolePromptInput,
      setRolePromptInput,
      handleSaveRole,
      handleCancelRole,
    } = useRoles(app);

    // 瀑布流布局相关（封装为 Hook）
    const { containerRef, cardRefs, containerHeight } = useWaterfallLayout({
      active: showHistoryAndRoles === "history",
      itemsCount: historyList.length,
    });
    const historyAndRolesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          historyAndRolesRef.current &&
          !historyAndRolesRef.current.contains(event.target as Node)
        ) {
          // @ts-ignore
          if (event.target?.className?.includes?.("icon-wrap")) return;
          setShowHistoryAndRoles(null);
        }
      };

      if (showHistoryAndRoles) {
        document.addEventListener("mousedown", handleClickOutside);
      } else {
        document.removeEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showHistoryAndRoles]);

    /**
     * 新增对话逻辑：
     * - 若当前对话的消息为空，则不允许创建新的对话，并弹出提示。
     * - 否则创建新的对话并切换到该对话。
     */
    const handleAddCore = async () => {
      // 根据当前选中 ID 获取当前对话项
      const currentItem = historyList.find((it) => it.id === currentId);
      const isEmpty =
        !currentItem ||
        !currentItem.messages ||
        currentItem.messages.length === 0;

      if (isEmpty) {
        new Notice("当前对话为空，请先输入内容再创建新的对话~");
        return;
      }

      const item = await addEmptyItem();
      try {
        const defaultRole = await getDefaultRole();
        const newHistoryItem = (await getHistoryItemById(item.id)) ?? {
          id: item.id,
          messages: [],
          systemMessage: defaultRole?.systemPrompt,
          roleName: defaultRole?.name,
        };
        setHistoryList((prev) => [newHistoryItem, ...prev]);
        setCurrentId(item.id);
        setHistoryItems(newHistoryItem);
        setSelectedRole(defaultRole);
      } catch (e) {
        // 忽略错误
      }
    };

    // 为新增对话按钮添加防抖
    const handleAdd = debounce(handleAddCore, 500);

    const handleUpdateHistoryItem = (item: HistoryItem) => {
      setCurrentId(item.id);
      setHistoryItems(item);
      if (item.roleName && item.systemMessage) {
        setSelectedRole({
          name: item.roleName,
          systemPrompt: item.systemMessage,
        });
      } else {
        setSelectedRole(null);
      }
    };

    useEffect(() => {
      (async () => {
        try {
          // 加载历史记录列表
          const items = await fetchHistoryList();
          setHistoryList(items);
          if (!currentId || !items.some((item) => item.id === currentId)) {
            const firstItem = items[0];
            if (firstItem) {
              handleUpdateHistoryItem(firstItem);
            } else {
              setCurrentId("");
            }
          } else {
            const currentItem = items.find((it) => it.id === currentId);
            if (currentItem) {
              handleUpdateHistoryItem(currentItem);
            }
          }
        } catch (e) {
          // 忽略错误
        }
      })();
    }, [fetchHistoryList, updater]);

    useEffect(() => {
      if (!selectedRole || !historyItems.id) return;
      const updatedHistoryItem = {
        ...historyItems,
        roleName: selectedRole.name,
        systemMessage: selectedRole.systemPrompt,
      };
      setHistoryItems(updatedHistoryItem);
      upsertHistoryItem(updatedHistoryItem);
    }, [selectedRole]);

    const deleteHistoryLastRecord = async (id: string) => {
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
        // 忽略错误
      }
    };

    const deleteHistoryMultiRecorder = async (id: string) => {
      // 如果有多条记录，正常删除
      await deleteHistoryItem(id);
      const items = await fetchHistoryList();
      setHistoryList(items);

      if (id === currentId) {
        // 如果删除的是当前项，切换到第一条
        setCurrentId(items[0]?.id || "");
      }
    };
    const handleDelete = async (id: string) => {
      // 如果删除前只有一条记录，先创建一条新记录
      if (historyList.length === 1) {
        return deleteHistoryLastRecord(id);
      } else {
        return deleteHistoryMultiRecorder(id);
      }
    };

    // 瀑布流逻辑已迁移至 useWaterfallLayout Hook

    // 历史记录 item 卡片样式
    const historyItemCardRender = (item: HistoryItem, index: number) => {
      const isActive = item.id === currentId;

      const handleDeleteClick = () => {
        handleDelete(item.id);
      };

      /**
       * 提取首条用户问题与首条 AI 回答预览文本，用于历史卡片展示。
       * 若不存在对应消息，返回空字符串，避免渲染异常。
       */
      const getFirstUserAndAssistant = (messages?: HistoryItem["messages"]) => {
        const list = messages || [];
        const firstUser =
          list.find((m: any) => m?.type === "user")?.content || "";
        const firstAssistant =
          list.find((m: any) => m?.type === "assistant")?.content || "";
        return { question: firstUser, answer: firstAssistant };
      };

      const isEmpty = !item.messages || item.messages.length === 0;

      const { question, answer } = getFirstUserAndAssistant(item.messages);

      return (
        <div
          ref={(el) => (cardRefs.current[index] = el)}
          className={`${styles.historyItemCard} ${
            isActive ? styles.historyItemCardActive : ""
          }`}
          key={index}
          onClick={() => handleUpdateHistoryItem(item)}
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
                <CloseIcon onClick={handleDeleteClick} />
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
                <CloseIcon onClick={handleDeleteClick} />
              </div>
            </>
          )}
        </div>
      );
    };

    return (
      <>
        <div style={{ position: "relative", zIndex: 10 }}>
          <div className={styles.historyWrap}>
            <div className={styles.historyActions}>
              <RoleExpandIcon
                onClick={handleExpand}
                className={
                  showHistoryAndRoles === "roles" ? styles.activeIcon : ""
                }
              />
              <HistoryExpandIcon
                onClick={handleHistoryExpand}
                className={
                  showHistoryAndRoles === "history" ? styles.activeIcon : ""
                }
              />
            </div>
            <div className={styles.currentRole}>
              {selectedRole ? selectedRole.name : "默认角色"}
            </div>
            <AddChatIcon onClick={handleAdd} />
          </div>
          {showHistoryAndRoles && (
            <div
              ref={historyAndRolesRef}
              className={`${styles.historyAndRolesContainer}
              ${
                showHistoryAndRoles === "history"
                  ? styles.historyListPosition
                  : styles.rolesPosition
              }
                `}
            >
              {/*  角色切换 */}
              {showHistoryAndRoles === "roles" && renderRoleList()}
              {/* 历史记录卡片 */}
              {showHistoryAndRoles === "history" && (
                <div className={styles.history}>
                  <div
                    ref={containerRef}
                    className={styles.historyExpandList}
                    style={{
                      height:
                        containerHeight > 0
                          ? `${containerHeight + 30}px`
                          : "30vh",
                      maxHeight: "50vh", // 恢复最大高度限制，防止过高
                    }}
                  >
                    {historyList.map((item: HistoryItem, index: number) =>
                      historyItemCardRender(item, index)
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {isRoleModalOpen && (
          <RoleModal
            roleName={roleNameInput}
            rolePrompt={rolePromptInput}
            onNameChange={setRoleNameInput}
            onPromptChange={setRolePromptInput}
            onSave={handleSaveRole}
            onCancel={handleCancelRole}
          />
        )}
      </>
    );
  };
  return {
    historyRender,
    historyItems,
    currentId,
    forceHistoryUpdate,
    selectedRole: (historyRender as any).selectedRole, // This is a hack, but it works for now
  };
};
