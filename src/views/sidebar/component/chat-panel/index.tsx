import { App, Notice } from "obsidian";
import { useState, useEffect, useRef } from "react";
import {
  AddChatIcon,
  HistoryExpandIcon,
  RoleExpandIcon,
} from "../../../../ui/icon";
import styles from "./css/styles.module.css";
import { HistoryItem } from "../../type";
import { useContext } from "../../hooks/use-context";
import { debounce } from "../../../../utils";
import { WaterfallWrapper } from "./use-waterfall-layout";
import { useHistoryCard } from "./history-card";
import { useShowModal } from "./use-show-modal";
import { createRoleModal } from "./create-role-modal";
import { useRoles } from "./roles";

export type ChatMessageProps = {
  app: App;
};

// TODO：i18n
export const useHistory = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItem>();
  const [currentId, setCurrentId] = useState<string>("");
  // 用于强制刷新历史记录列表的触发器
  const [updater, setUpdater] = useState(0);

  const {
    modalRef,
    handleExpand,
    setShowHistoryAndRoles,
    showHistoryAndRoles,
  } = useShowModal();

  /**
   * 强制刷新历史记录列表
   */
  const forceHistoryUpdate = () => {
    setUpdater((u) => u + 1);
  };

  const HistoryRender: React.FC<ChatMessageProps> = ({ app }) => {
    const {
      addEmptyItem,
      fetchHistoryList,
      getHistoryItemById,
      deleteHistoryItem,
      getDefaultRole,
      upsertHistoryItem,
    } = useContext(app);
    const [historyList, setHistoryList] = useState<HistoryItem[]>([]);

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

    const RoleModal = createRoleModal({
      onNameChange: setRoleNameInput,
      onPromptChange: setRolePromptInput,
      onSave: handleSaveRole,
      onCancel: handleCancelRole,
    });

    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    /**
     * 新增对话逻辑：
     * - 若当前对话的消息为空，则不允许创建新的对话，并弹出提示。
     * - 否则创建新的对话并切换到该对话。
     */
    const handleAddCore = async () => {
      // 根据当前选中 ID 获取当前对话项
      const emptyItem = historyList.find(
        (it) => Array.isArray(it.messages) && it.messages.length === 0,
      );
      if (emptyItem) {
        if (emptyItem.id === currentId) {
          new Notice("当前对话为空，请先输入内容再创建新的对话~");
          return;
        }
        // 如果当前存在空对话，则直接切换到该空对话
        setCurrentId(emptyItem.id);
        const emptyHistoryItem = (await getHistoryItemById(emptyItem.id)) ?? {
          id: emptyItem.id,
          messages: [],
        };
        setHistoryItems(emptyHistoryItem);
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

    /**
     * 切换历史项并更新当前会话
     * 成功切换后关闭历史弹窗，避免遮挡聊天区域
     */
    const handleUpdateHistoryItem = (item: HistoryItem) => {
      setCurrentId(item.id);
      setHistoryItems(item);
      // 控制弹窗显隐
      if (item.roleName && item.systemMessage) {
        setSelectedRole({
          name: item.roleName,
          systemPrompt: item.systemMessage,
        });
      } else {
        setSelectedRole(null);
      }
      setShowHistoryAndRoles(null);
    };

    useEffect(() => {
      (async () => {
        try {
          // 加载历史记录列表
          const items = await fetchHistoryList();
          setHistoryList(items);
          /**
           * 首次加载逻辑（函数级注释）：
           * - 若列表为空，自动创建一个“空会话”作为种子，避免 currentId 为空导致无法保存。
           * - 若 currentId 不存在或不在列表中，则切换到第一条记录。
           * 边界处理：
           * - items 为空：创建新记录并设置 currentId；
           * - items 非空但找不到 currentId：切换到第一条；
           */
          if (!items || items.length === 0) {
            // 创建种子会话，保证后续保存逻辑能写入文件
            const seed = await addEmptyItem();
            const seedItem = (await getHistoryItemById(seed.id)) ?? {
              id: seed.id,
              messages: [],
            };
            setHistoryList([seedItem]);
            setCurrentId(seed.id);
            handleUpdateHistoryItem(seedItem);
          } else if (
            !currentId ||
            !items.some((item) => item.id === currentId)
          ) {
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
      if (!selectedRole || !historyItems?.id) return;
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
    const handleDelete = async ({ id }: { id: string }) => {
      // 如果删除前只有一条记录，先创建一条新记录
      if (historyList.length === 1) {
        return deleteHistoryLastRecord(id);
      } else {
        return deleteHistoryMultiRecorder(id);
      }
    };

    const { HistoryCard } = useHistoryCard({
      onClickHistoryItem: handleUpdateHistoryItem,
      onClickDelete: handleDelete,
    });

    return (
      <>
        <div style={{ position: "relative", zIndex: 10 }}>
          <div className={styles.historyWrap}>
            <div className={styles.historyActions}>
              <RoleExpandIcon
                data-key="roles"
                active={showHistoryAndRoles === "roles"}
                onClick={handleExpand}
              />
              <HistoryExpandIcon
                data-key="history"
                active={showHistoryAndRoles === "history"}
                onClick={handleExpand}
              />
              <AddChatIcon onClick={handleAdd} />
            </div>
            <div className={styles.currentRole}>
              <span>Person: </span>
              <span>{selectedRole ? selectedRole.name : "默认角色"}</span>
            </div>
          </div>
          {showHistoryAndRoles && (
            <div
              ref={modalRef}
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
                <WaterfallWrapper
                  itemsCount={historyList.length}
                  cardRefs={cardRefs}
                >
                  {historyList.map((item: HistoryItem, index: number) => (
                    <HistoryCard
                      ref={(el) => (cardRefs.current[index] = el)}
                      key={item.id + index}
                      index={index}
                      item={item}
                      isActive={item.id === currentId}
                    />
                  ))}
                </WaterfallWrapper>
              )}
            </div>
          )}
        </div>
        {isRoleModalOpen && (
          <RoleModal roleName={roleNameInput} rolePrompt={rolePromptInput} />
        )}
      </>
    );
  };
  return {
    HistoryRender,
    historyItems,
    currentId,
    forceHistoryUpdate,
    selectedRole: (HistoryRender as any).selectedRole, // This is a hack, but it works for now
  };
};
