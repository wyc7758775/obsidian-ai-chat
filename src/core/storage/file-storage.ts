import { App, TFile } from "obsidian";
import { HistoryItem, NoteReference } from "../../views/sidebar/type";
import { NoteContext } from "../fs-context/note-context";

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
      // 确保目录存在（只有当文件不在根目录时）
      const lastSlashIndex = this.dataFile.lastIndexOf("/");
      if (lastSlashIndex > 0) {
        const dir = this.dataFile.substring(0, lastSlashIndex);
        if (!(await adapter.exists(dir))) {
          await adapter.mkdir(dir);
        }
      }

      // 创建空的数据文件
      await adapter.write(this.dataFile, JSON.stringify({}));
    }
  }

  /**
   * 从文件加载所有历史记录到内存缓存
   */
  private async loadFromFile(): Promise<void> {
    try {
      await this.ensureDataFile();
      const adapter = this.app.vault.adapter;
      const content = await adapter.read(this.dataFile);

      const data = JSON.parse(content) as Record<string, HistoryItem>;
      this.cache.clear();

      // 将数据加载到缓存中
      Object.values(data).forEach((item) => {
        this.cache.set(item.id, item);
      });

      this.isLoaded = true;
    } catch (error) {
      console.error(
        "[FileStorage] Failed to load chat history from file:",
        error
      );
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
      console.log("=== saveToFile 开始 ===");
      console.log("缓存项数量:", this.cache.size);
      console.log("完整文件路径:", this.getFullDataFilePath());
      
      await this.ensureDataFile();
      const adapter = this.app.vault.adapter;

      // 将缓存转换为对象
      const data: Record<string, HistoryItem> = {};
      this.cache.forEach((item, id) => {
        data[id] = item;
        console.log(`缓存项 ${id} 的 noteSelected:`, item.noteSelected);
      });

      const jsonData = JSON.stringify(data, null, 2);
      console.log("准备写入的 JSON 数据长度:", jsonData.length);
      console.log("文件路径:", this.dataFile);

      // 写入文件
      await adapter.write(this.dataFile, jsonData);
      console.log("文件写入完成");

      // 验证文件是否写入成功
      const savedContent = await adapter.read(this.dataFile);
      const savedData = JSON.parse(savedContent);
      const savedItemCount = Object.keys(savedData).length;
      
      console.log("验证：文件中的项目数量:", savedItemCount);
      console.log("验证：期望的项目数量:", Object.keys(data).length);

      if (savedItemCount !== Object.keys(data).length) {
        throw new Error(
          `Data integrity check failed: expected ${
            Object.keys(data).length
          } items, but file contains ${savedItemCount} items`
        );
      }
      
      console.log("=== saveToFile 完成 ===");
    } catch (error) {
      console.error(
        "[FileStorage] Failed to save chat history to file:",
        error
      );
      throw error;
    }
  }

  /**
   * 保存或更新历史记录项
   */
  async upsertHistoryItem(item: HistoryItem): Promise<void> {
    console.log("=== FileStorageService.upsertHistoryItem ===");
    console.log("保存的 item.id:", item.id);
    console.log("保存的 item.noteSelected:", item.noteSelected);
    console.log("文件路径:", this.dataFile);
    
    await this.loadFromFile();

    // 更新缓存
    this.cache.set(item.id, item);

    // 保存到文件
    await this.saveToFile();
    
    console.log("保存完成，缓存大小:", this.cache.size);
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
    try {
      await this.loadFromFile();

      // 检查要删除的项是否存在
      const itemExists = this.cache.has(id);

      if (!itemExists) {
        return;
      }

      // 从缓存中删除
      const deleteResult = this.cache.delete(id);

      if (!deleteResult) {
        console.error(`[FileStorage] Failed to delete item ${id} from cache`);
        throw new Error(`Failed to delete item ${id} from cache`);
      }

      // 保存到文件
      await this.saveToFile();

      // 验证删除结果 - 强制重新加载确保数据同步
      this.isLoaded = false; // 强制下次重新加载
      await this.loadFromFile();
      const verificationExists = this.cache.has(id);

      if (verificationExists) {
        console.error(
          `[FileStorage] CRITICAL ERROR: Item ${id} still exists after deletion!`
        );
        throw new Error(`Item ${id} was not properly deleted from file`);
      }
    } catch (error) {
      console.error(`[FileStorage] Error deleting history item ${id}:`, error);
      throw error;
    }
  }



  /**
   * 强制重新加载数据（清理缓存并重新从文件加载）
   */
  async forceReload(): Promise<void> {
    this.cache.clear();
    this.isLoaded = false;
    await this.loadFromFile();
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

  /**
   * 获取完整的文件路径（用于调试）
   */
  getFullDataFilePath(): string {
    // 使用 vault 的名称和适配器信息
    const adapter = this.app.vault.adapter as any;
    const basePath = adapter.basePath || adapter.path || this.app.vault.getName();
    return `${basePath}/${this.dataFile}`;
  }

  /**
   * 获取缓存状态（用于调试）
   */
  getCacheInfo(): { size: number; isLoaded: boolean; items: string[] } {
    return {
      size: this.cache.size,
      isLoaded: this.isLoaded,
      items: Array.from(this.cache.keys()),
    };
  }

  /**
   * 调试工具：获取完整的调试信息
   */
  async getDebugInfo(): Promise<{
    cacheInfo: { size: number; isLoaded: boolean; items: string[] };
    fileContent: string;
    fileExists: boolean;
    filePath: string;
  }> {
    const adapter = this.app.vault.adapter;
    const fileExists = await adapter.exists(this.dataFile);
    let fileContent = "";

    if (fileExists) {
      try {
        fileContent = await adapter.read(this.dataFile);
      } catch (error) {
        fileContent = `Error reading file: ${error}`;
      }
    }

    return {
      cacheInfo: this.getCacheInfo(),
      fileContent,
      fileExists,
      filePath: this.dataFile,
    };
  }

  /**
   * 调试工具：强制删除指定项目（绕过所有缓存）
   */
  async forceDeleteItem(id: string): Promise<void> {
    const adapter = this.app.vault.adapter;

    // 直接读取文件
    const content = await adapter.read(this.dataFile);
    const data = JSON.parse(content) as Record<string, HistoryItem>;

    // 删除项目
    delete data[id];

    // 直接写入文件
    await adapter.write(this.dataFile, JSON.stringify(data, null, 2));

    // 清除缓存，强制重新加载
    this.cache.clear();
    this.isLoaded = false;
  }

  /**
   * 根据笔记路径获取 TFile 对象
   */
  getTFileByPath(path: string): TFile | null {
    const abstractFile = this.app.vault.getAbstractFileByPath(path);
    return abstractFile instanceof TFile ? abstractFile : null;
  }

  /**
   * 将 NoteContext 转换为轻量级的 NoteReference
   */
  convertToNoteReference(noteContext: NoteContext): NoteReference | null {
    const file = noteContext.file;
    if (!file) return null;

    return {
      path: file.path,
      title: noteContext.title || file.basename,
      mtime: file.stat.mtime,
      ctime: file.stat.ctime,
    };
  }

  /**
   * 将 NoteReference 数组转换为完整的 NoteContext 数组
   * 动态获取最新的文件内容和元数据
   * 使用时间戳验证文件是否为预期的文件
   */
  async convertToNoteContexts(noteRefs: NoteReference[]): Promise<NoteContext[]> {
    const results: NoteContext[] = [];
    
    for (const ref of noteRefs) {
      const file = this.getTFileByPath(ref.path);
      if (file) {
        try {
          // 验证文件时间戳（如果有的话）
          if (ref.ctime && file.stat.ctime !== ref.ctime) {
            console.warn(
              `文件创建时间不匹配: ${ref.path}, 期望: ${ref.ctime}, 实际: ${file.stat.ctime}`
            );
            // 继续处理，但记录警告
          }

          // 获取笔记内容
          const content = await this.app.vault.read(file);
          const cache = this.app.metadataCache.getFileCache(file);

          const noteContext: NoteContext = {
            file,
            title: ref.title,
            content: this.cleanContent(content),
            path: file.path,
            tags: cache?.tags?.map((tag) => tag.tag) || [],
            links: cache?.links?.map((link) => link.link) || [],
          };

          results.push(noteContext);
        } catch (error) {
          console.error(`Failed to load note content for ${ref.path}:`, error);
          // 即使内容加载失败，也返回基本信息
          results.push({
            file,
            title: ref.title,
            path: file.path,
            content: "",
            tags: [],
            links: [],
          });
        }
      } else {
        console.warn(`文件不存在: ${ref.path}`);
      }
    }

    return results;
  }

  /**
   * 清理内容（移除 Obsidian 特殊语法）
   * 复制自 NoteContextService 的实现
   */
  private cleanContent(content: string): string {
    return (
      content
        // 移除 YAML frontmatter
        .replace(/^---[\s\S]*?---\n/, "")
        // 移除 Obsidian 链接语法
        .replace(/\[\[([^\]]+)\]\]/g, "$1")
        // 移除标签
        .replace(/#[\w-]+/g, "")
        // 移除多余的空行
        .replace(/\n\s*\n/g, "\n")
        .trim()
    );
  }
}
