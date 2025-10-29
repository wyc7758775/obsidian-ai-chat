import { App } from "obsidian";
import { HistoryItem } from "../../views/sidebar/type";

/**
 * 基于文件系统的历史记录存储服务
 * 将数据存储在插件目录下的JSON文件中，支持跨设备同步
 */
export class FileStorageService {
  private app: App;
  private dataFile = "chat-history.json"; // 存储在vault根目录
  private cache: Map<string, HistoryItem> = new Map();
  private isLoaded = false;

  constructor(app: App) {
    this.app = app;
  }

  /**
   * 确保数据文件存在
   */
  private async ensureDataFile(): Promise<void> {
    const adapter = this.app.vault.adapter;
    
    // 检查文件是否存在
    const exists = await adapter.exists(this.dataFile);
    if (!exists) {
      // 确保目录存在
      const dir = this.dataFile.substring(0, this.dataFile.lastIndexOf('/'));
      if (!(await adapter.exists(dir))) {
        await adapter.mkdir(dir);
      }
      
      // 创建空的数据文件
      await adapter.write(this.dataFile, JSON.stringify({}));
    }
  }

  /**
   * 从文件加载所有历史记录到内存缓存
   */
  private async loadFromFile(): Promise<void> {
    if (this.isLoaded) return;

    try {
      await this.ensureDataFile();
      const adapter = this.app.vault.adapter;
      const content = await adapter.read(this.dataFile);
      
      const data = JSON.parse(content) as Record<string, HistoryItem>;
      this.cache.clear();
      
      // 将数据加载到缓存中
      Object.values(data).forEach(item => {
        this.cache.set(item.id, item);
      });
      
      this.isLoaded = true;
    } catch (error) {
      console.error("Failed to load chat history from file:", error);
      // 如果加载失败，初始化为空缓存
      this.cache.clear();
      this.isLoaded = true;
    }
  }

  /**
   * 将缓存数据保存到文件
   */
  private async saveToFile(): Promise<void> {
    try {
      await this.ensureDataFile();
      const adapter = this.app.vault.adapter;
      
      // 将缓存转换为对象
      const data: Record<string, HistoryItem> = {};
      this.cache.forEach((item, id) => {
        data[id] = item;
      });
      
      // 写入文件
      await adapter.write(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to save chat history to file:", error);
      throw error;
    }
  }

  /**
   * 插入或更新历史记录项
   */
  async upsertHistoryItem(item: HistoryItem): Promise<void> {
    await this.loadFromFile();
    
    // 更新缓存
    this.cache.set(item.id, { ...item });
    
    // 保存到文件
    await this.saveToFile();
  }

  /**
   * 获取所有历史记录列表，按创建时间倒序排列
   */
  async fetchHistoryList(): Promise<HistoryItem[]> {
    await this.loadFromFile();
    
    const items = Array.from(this.cache.values());
    return items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }

  /**
   * 根据ID获取历史记录项
   */
  async getHistoryItemById(id: string): Promise<HistoryItem | undefined> {
    await this.loadFromFile();
    return this.cache.get(id);
  }

  /**
   * 创建空的历史记录项
   */
  async addEmptyItem(): Promise<HistoryItem> {
    await this.loadFromFile();
    
    const item: HistoryItem = {
      id: crypto.randomUUID(),
      messages: [],
      noteSelected: [],
      createdAt: Date.now(),
    };
    
    // 添加到缓存
    this.cache.set(item.id, item);
    
    // 保存到文件
    await this.saveToFile();
    
    return item;
  }

  /**
   * 删除历史记录项
   */
  async deleteHistoryItem(id: string): Promise<void> {
    await this.loadFromFile();
    
    // 从缓存中删除
    this.cache.delete(id);
    
    // 保存到文件
    await this.saveToFile();
  }

  /**
   * 从IndexedDB迁移数据到文件存储
   */
  async migrateFromIndexedDB(): Promise<void> {
    try {
      // 尝试从IndexedDB读取数据
      const dbData = await this.readFromIndexedDB();
      
      if (dbData.length > 0) {
        console.log(`Migrating ${dbData.length} items from IndexedDB to file storage...`);
        
        // 加载现有文件数据
        await this.loadFromFile();
        
        // 合并数据（文件中的数据优先，避免覆盖）
        dbData.forEach(item => {
          if (!this.cache.has(item.id)) {
            this.cache.set(item.id, item);
          }
        });
        
        // 保存合并后的数据
        await this.saveToFile();
        
        console.log("Migration completed successfully");
      }
    } catch (error) {
      console.warn("Migration from IndexedDB failed, but this is not critical:", error);
    }
  }

  /**
   * 从IndexedDB读取数据（用于迁移）
   */
  private async readFromIndexedDB(): Promise<HistoryItem[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("yoran-ai-chat-db", 1);
      
      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };
      
      request.onsuccess = () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains("history")) {
          resolve([]);
          return;
        }
        
        const transaction = db.transaction(["history"], "readonly");
        const store = transaction.objectStore("history");
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          db.close();
          resolve(getAllRequest.result as HistoryItem[]);
        };
        
        getAllRequest.onerror = () => {
          db.close();
          reject(new Error("Failed to read from IndexedDB"));
        };
      };
    });
  }

  /**
   * 清理缓存（用于测试或重置）
   */
  clearCache(): void {
    this.cache.clear();
    this.isLoaded = false;
  }

  /**
   * 获取数据文件路径（用于调试）
   */
  getDataFilePath(): string {
    return this.dataFile;
  }
}