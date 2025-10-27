import { useCallback } from "react";
import { HistoryItem } from "../type";

const DB_NAME = "yoran-ai-chat-db";
const STORE_NAME = "history";
export const useContext = () => {
  const openDB = useCallback(async (): Promise<IDBDatabase> => {
    return await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, []);

  const upsertHistoryItem = useCallback(
    async (item: HistoryItem) => {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error);
        };
      });
    },
    [openDB]
  );

  // 新增：读取全部会话列表
  const fetchHistoryList = useCallback(async (): Promise<HistoryItem[]> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const items = await new Promise<HistoryItem[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result ?? []) as HistoryItem[]);
      req.onerror = () => reject(req.error);
    });

    db.close();
    return items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [openDB]);

  // 新增：按 ID 读取会话
  const getHistoryItemById = useCallback(
    async (id: string): Promise<HistoryItem | undefined> => {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);

      const item = await new Promise<HistoryItem | undefined>(
        (resolve, reject) => {
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result as HistoryItem | undefined);
          req.onerror = () => reject(req.error);
        }
      );

      db.close();
      return item;
    },
    [openDB]
  );

  // 新增：创建空会话（id 使用 crypto.randomUUID）
  const addEmptyItem = useCallback(async (): Promise<HistoryItem> => {
    const item: HistoryItem = {
      id: crypto.randomUUID(),
      messages: [],
      noteSelected: [],
      createdAt: Date.now(),
    };
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const req = store.add(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    db.close();
    return item;
  }, [openDB]);

  // 新增：删除会话
  const deleteHistoryItem = useCallback(
    async (id: string): Promise<void> => {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      // 等待事务真正提交后再关闭连接，避免读到未提交的旧值
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error);
        };
      });
    },
    [openDB]
  );

  return {
    upsertHistoryItem,
    fetchHistoryList,
    getHistoryItemById,
    addEmptyItem,
    deleteHistoryItem,
  };
};
