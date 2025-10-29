import { useCallback, useMemo } from "react";
import { HistoryItem } from "../type";
import { FileStorageService } from "../../../core/storage/file-storage";
import { App } from "obsidian";

export const useContext = (app: App) => {
  // 创建文件存储服务实例
  const fileStorage = useMemo(() => new FileStorageService(app), [app]);

  // 插入或更新历史记录项
  const upsertHistoryItem = useCallback(
    async (item: HistoryItem) => {
      await fileStorage.upsertHistoryItem(item);
    },
    [fileStorage]
  );

  // 读取全部会话列表
  const fetchHistoryList = useCallback(async (): Promise<HistoryItem[]> => {
    return await fileStorage.fetchHistoryList();
  }, [fileStorage]);

  // 按 ID 读取会话
  const getHistoryItemById = useCallback(
    async (id: string): Promise<HistoryItem | undefined> => {
      return await fileStorage.getHistoryItemById(id);
    },
    [fileStorage]
  );

  // 创建空会话
  const addEmptyItem = useCallback(async (): Promise<HistoryItem> => {
    return await fileStorage.addEmptyItem();
  }, [fileStorage]);

  // 删除会话
  const deleteHistoryItem = useCallback(
    async (id: string): Promise<void> => {
      await fileStorage.deleteHistoryItem(id);
    },
    [fileStorage]
  );

  // 数据迁移（从IndexedDB迁移到文件存储）
  const migrateFromIndexedDB = useCallback(async (): Promise<void> => {
    await fileStorage.migrateFromIndexedDB();
  }, [fileStorage]);

  return {
    upsertHistoryItem,
    fetchHistoryList,
    getHistoryItemById,
    addEmptyItem,
    deleteHistoryItem,
    migrateFromIndexedDB,
  };
};
