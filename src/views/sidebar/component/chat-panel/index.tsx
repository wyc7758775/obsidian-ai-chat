import { App, Notice } from "obsidian";
import { useState, useEffect, useRef } from "react";
import styles from "./css/styles.module.css";
import { HistoryItem } from "../../type";
import { useContext } from "../../hooks/use-context";
import { debounce } from "../../../../utils";
import { WaterfallWrapper } from "./use-waterfall-layout";
import { useHistoryCard } from "./history-card";
import { useShowModal } from "./use-show-modal";
import { useRoles } from "./roles";
import { RoleModal } from "./role-modal/with-role-modal";
import type { RoleItem } from "../../../../core/storage/role-storage";
import { WithActions, ActiveKey } from "./with-actions";

export type ChatMessageProps = {
  app: App;
  selectedRole: RoleItem | null;
  setSelectedRole: (role: RoleItem | null) => void;
};

// TODO：i18n
export const useHistory = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItem>();
  const [currentId, setCurrentId] = useState<string>("");
  // 用于强制刷新历史记录列表的触发器
  const [updater, setUpdater] = useState(0);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  // 确保 selectedRole 已初始化
  const initializedSelectedRole =
    selectedRole === undefined ? null : selectedRole;

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

  const ChatPanel: React.FC<{ app: App }> = ({ app }) => {
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
      initRoleName,
      initRolePrompt,
      renderRoleList,
      isRoleModalOpen,
      handleCancelRole,
      handleSuccessRole,
    } = useRoles(app, initializedSelectedRole, setSelectedRole);

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
      setShowHistoryAndRoles(ActiveKey.NONE);
    };

    useEffect(() => {
      (async () => {
        // 加载历史记录列表
        const items = await fetchHistoryList();
        setHistoryList(items);
        /**
         * 首次加载逻辑（函数级注释）：
         * - 若列表为空，自动创建一个"空会话"作为种子，避免 currentId 为空导致无法保存。
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
          return;
        }
        if (!currentId || !items.some((item) => item.id === currentId)) {
          items[0] ? handleUpdateHistoryItem(items[0]) : setCurrentId("");
        } else {
          const currentItem = items.find((it) => it.id === currentId);
          if (currentItem) {
            handleUpdateHistoryItem(currentItem);
          }
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
          <WithActions
            activeKey={showHistoryAndRoles}
            currentRoleName={selectedRole?.name}
            onAdd={handleAdd}
            onExpand={handleExpand}
          />
          {showHistoryAndRoles !== ActiveKey.NONE && (
            <div
              ref={modalRef}
              className={`
                ${styles.historyAndRolesContainer}
                ${
                  showHistoryAndRoles === ActiveKey.HISTORY
                    ? styles.historyListPosition
                    : styles.rolesPosition
                }
              `}
            >
              {/*  角色切换 */}
              {showHistoryAndRoles === ActiveKey.ROLES && renderRoleList()}
              {/* 历史记录卡片 */}
              {showHistoryAndRoles === ActiveKey.HISTORY && (
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
        <div style={{ display: isRoleModalOpen ? "block" : "none" }}>
          <RoleModal
            key="role-modal"
            app={app}
            initRoleName={initRoleName}
            initRolePrompt={initRolePrompt}
            onCancel={handleCancelRole}
            onSuccess={handleSuccessRole}
          />
        </div>
      </>
    );
  };

  return {
    ChatPanel,
    historyItems,
    currentId,
    forceHistoryUpdate,
    selectedRole: initializedSelectedRole,
    setSelectedRole,
  };
};
