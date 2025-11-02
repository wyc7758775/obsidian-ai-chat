import { App, Notice } from "obsidian";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  AddChatIcon,
  PersonIcon,
  CloseIcon,
  RoleExpandIcon,
  HistoryExpandIcon,
  CatEmptyIcon,
  EditIcon,
  AddSmallIcon,
} from "../icon";
import styles from "./css/styles.module.css";
import { HistoryItem } from "../../type";
import { useContext } from "../../hooks/use-context";

import type { RoleItem } from "../../../../core/storage/role-storage";
import { RoleModal } from "./role-modal";
import { debounce } from "../../../../utils";

export type ChatMessageProps = {
  app: App;
};

export const useHistory = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItem>(
    {} as HistoryItem
  );
  const [currentId, setCurrentId] = useState<string>("");
  // 当前选中的角色需要在 hook 作用域声明，便于外部读取与内部更新
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
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
      fetchRoles,
      getDefaultRole,
      upsertHistoryItem,
      upsertRole,
      deleteRoleByName,
    } = useContext(app);
    const [showRoles, setShowRoles] = useState<boolean>(false);
    const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
    const [showHistoryCards, setShowHistoryCards] = useState<boolean>(false);
    const [roles, setRoles] = useState<RoleItem[]>([]);
    // 新增/编辑角色弹窗
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [roleNameInput, setRoleNameInput] = useState("");
    const [rolePromptInput, setRolePromptInput] = useState("");
    const [editingRoleOriginalName, setEditingRoleOriginalName] = useState<
      string | null
    >(null);

    // 瀑布流布局相关
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [containerHeight, setContainerHeight] = useState(0);

    const initShowState = () => {
      setShowRoles(false);
      setShowHistoryCards(false);
    };
    const toggleRoleList = () => {
      initShowState();
      setShowRoles(!showRoles);
    };
    const toggleHistory = () => {
      initShowState();
      setShowHistoryCards(!showHistoryCards);
    };

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
        const defaultRole = selectedRole || (await getDefaultRole());
        const historyItem = (await getHistoryItemById(item.id)) ?? {
          id: item.id,
          messages: [],
          systemMessage: defaultRole?.systemPrompt,
          roleName: defaultRole?.name,
        };
        setHistoryList((prev) => [historyItem, ...prev]);
        setCurrentId(item.id);
      } catch (e) {
        // 忽略错误
      }
    };

    // 为新增对话按钮添加防抖
    const handleAdd = debounce(handleAddCore, 500);

    useEffect(() => {
      (async () => {
        try {
          // 加载历史记录列表
          const items = await fetchHistoryList();
          setHistoryList(items);
          if (!currentId || !items.some((item) => item.id === currentId)) {
            setCurrentId(items[0]?.id || "");
          }
          // 加载角色列表并默认选中第一位
          const roleList = await fetchRoles();
          setRoles(roleList);
          if (!selectedRole) {
            setSelectedRole(roleList[0] ?? null);
          }
        } catch (e) {
          // 忽略错误
        }
      })();
    }, [fetchHistoryList, updater]);

    // 根据当前历史记录的角色信息同步选中角色
    useEffect(() => {
      if (!currentId || roles.length === 0) return;
      const item = historyList.find((h) => h.id === currentId);
      if (item?.roleName) {
        const match = roles.find((r) => r.name === item.roleName) || null;
        setSelectedRole(match);
      } else {
        setSelectedRole(roles[0] ?? null);
      }
    }, [currentId, historyList, roles]);

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

    const handleUpdateHistoryItem = (item: HistoryItem) => {
      setCurrentId(item.id);
      setHistoryItems(item);
      // 根据历史记录的角色名称切换当前角色
      if (item.roleName) {
        const match = roles.find((r) => r.name === item.roleName) || null;
        setSelectedRole(match);
      } else {
        setSelectedRole(roles[0] ?? null);
      }
    };

    // 保存角色到存储并刷新列表
    const handleSaveRole = async () => {
      const name = roleNameInput.trim();
      const prompt = rolePromptInput.trim();
      if (!name || !prompt) {
        new Notice("请填写角色名称与系统提示语");
        return;
      }
      const newRole = { name, systemPrompt: prompt } as RoleItem;
      try {
        // 若为重命名，先删除旧名避免重复
        if (editingRoleOriginalName && editingRoleOriginalName !== name) {
          await deleteRoleByName(editingRoleOriginalName);
        }
        await upsertRole(newRole);
        const roleList = await fetchRoles();
        setRoles(roleList);
        setSelectedRole(newRole);
        setIsRoleModalOpen(false);
        setEditingRoleOriginalName(null);
        new Notice("角色已保存");
      } catch (e) {
        console.error("保存角色失败:", e);
        new Notice("保存角色失败");
      }
    };

    const handleCancelRole = () => {
      setIsRoleModalOpen(false);
      setEditingRoleOriginalName(null);
    };

    const roleItemRender = (role: RoleItem, index: number) => {
      const isActive = role.name === selectedRole?.name;

      return (
        <div
          className={`${styles.historyFoldItem} ${
            isActive ? styles.historyFoldItemActive : ""
          }`}
          key={index}
          onClick={() => setSelectedRole(role)}
        >
          <PersonIcon />
          <div className={styles.historyFoldText}>{role.name}</div>
          <div className={styles.historyFoldActions}>
            {/* 角色编辑：打开弹窗并预填 */}
            <EditIcon
              onClick={(e?: React.MouseEvent) => {
                e?.stopPropagation();
                setRoleNameInput(role.name);
                setRolePromptInput(role.systemPrompt);
                setEditingRoleOriginalName(role.name);
                setIsRoleModalOpen(true);
              }}
            />
          </div>
        </div>
      );
    };

    // 瀑布流布局计算
    const calculateWaterfallLayout = () => {
      if (!containerRef.current || !showHistoryCards) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth - 32; // 对应CSS中的左边距20px + 右边距12px
      const cardWidth = 180;
      const gap = 12; // 适中的间距，保持美观
      const columns = Math.max(
        1,
        Math.floor((containerWidth + gap) / (cardWidth + gap))
      );
      const actualCardWidth = (containerWidth - gap * (columns - 1)) / columns;

      const columnHeights = new Array(columns).fill(0);

      cardRefs.current.forEach((cardEl, index) => {
        if (!cardEl) return;

        // 找到最短的列
        const shortestColumnIndex = columnHeights.indexOf(
          Math.min(...columnHeights)
        );

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
    }, [historyList, showHistoryCards]);

    useEffect(() => {
      if (showHistoryCards) {
        const resizeObserver = new ResizeObserver(() => {
          calculateWaterfallLayout();
        });

        if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
      }
    }, [showHistoryCards]);

    /**
     * 一次性迁移旧数据中的角色信息：避免无限更新循环。
     * 仅在角色列表加载后执行一次，若需要修复则更新并持久化。
     */
    const migrationDoneRef = useRef(false);
    useEffect(() => {
      if (migrationDoneRef.current) return;
      if (!roles.length || !historyList.length) return;

      let changed = false;
      const updated = historyList.map((item) => {
        let targetRole = roles.find((r) => r.name === item.roleName) || null;
        if (!targetRole && item.systemMessage) {
          targetRole =
            roles.find((r) => r.systemPrompt === item.systemMessage) || null;
        }
        if (!targetRole) {
          targetRole = roles[0] || null;
        }
        if (!targetRole) return item;

        const needFix =
          item.roleName !== targetRole.name ||
          item.systemMessage !== targetRole.systemPrompt;
        if (!needFix) return item;

        changed = true;
        const fixedItem: HistoryItem = {
          ...item,
          roleName: targetRole.name,
          systemMessage: targetRole.systemPrompt,
        } as HistoryItem;

        // 异步持久化修复后的记录（不阻塞渲染）
        (async () => {
          try {
            await upsertHistoryItem(fixedItem);
          } catch (e) {
            console.error("迁移角色信息失败:", e);
          }
        })();

        return fixedItem;
      });

      if (changed) {
        setHistoryList(updated);
      }
      migrationDoneRef.current = true;
    }, [roles]);

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
        <div className={styles.historyWrap}>
          <div className={styles.historyActions}>
            <RoleExpandIcon onClick={toggleRoleList} />
            <HistoryExpandIcon onClick={toggleHistory} />
            <AddChatIcon onClick={handleAdd} />
          </div>
          {selectedRole && (
            <span style={{ marginLeft: 8, color: "var(--text-muted)" }}>
              person：{selectedRole.name}
            </span>
          )}
        </div>
        {/*  角色切换 */}
        {showRoles && (
          <div className={styles.historyFoldList}>
            {roles.map((role: RoleItem, index: number) =>
              roleItemRender(role, index)
            )}
            {/* 列表末尾添加“新增角色”入口 */}
            <div
              className={styles.historyFoldItem}
              onClick={() => setIsRoleModalOpen(true)}
            >
              <AddSmallIcon onClick={() => setIsRoleModalOpen(true)} />
              <div className={styles.historyFoldText}>新增角色</div>
            </div>
          </div>
        )}
        {/* 历史记录卡片 */}
        {showHistoryCards && (
          <div className={styles.history}>
            <div
              ref={containerRef}
              className={styles.historyExpandList}
              style={{
                height:
                  containerHeight > 0 ? `${containerHeight + 30}px` : "30vh",
                maxHeight: "50vh", // 恢复最大高度限制，防止过高
              }}
            >
              {historyList.map((item: HistoryItem, index: number) =>
                historyItemCardRender(item, index)
              )}
            </div>
          </div>
        )}

        {/* 新增角色弹窗 */}
        <RoleModal
          isOpen={isRoleModalOpen}
          roleName={roleNameInput}
          rolePrompt={rolePromptInput}
          onNameChange={setRoleNameInput}
          onPromptChange={setRolePromptInput}
          onSave={handleSaveRole}
          onCancel={handleCancelRole}
        />
      </>
    );
  };
  return {
    historyRender,
    historyItems,
    currentId,
    selectedRole,
    forceHistoryUpdate,
  };
};
