import { App, TFile } from "obsidian";
import { HistoryItem, NoteReference } from "../../views/sidebar/type";
import { NoteContext } from "../fs-context/note-context";

/**
 * 基于文件系统的历史记录存储服务
 * 将数据存储在插件目录下的JSON文件中，支持跨设备同步
 */
export class FileStorageService {
  private app: App;
  private dataFile = "chat-history.json"; // 存储在目标目录下
  private cache: Map<string, HistoryItem> = new Map();
  private isLoaded = false;
  private pluginFolderName: string;

  /**
   * 构造函数：注入 Obsidian App 与插件名
   * - 输入：`app`（Obsidian 应用实例）、`pluginFolderName`（插件文件夹名，未清洗）
   * - 输出：无
   * - 边界处理：当未提供插件名时，回退为 `obsidian-plugin`
   */
  constructor(app: App, pluginFolderName?: string) {
    this.app = app;
    this.pluginFolderName = pluginFolderName || "obsidian-plugin";
  }

  /**
   * 确保数据文件存在
   */
  private async ensureDataFile(): Promise<void> {
    const adapter = this.app.vault.adapter;

    // 解析并设置数据文件路径（优先使用插件文件夹名）
    await this.resolveDataFilePath();

    // 检查文件是否存在
    const exists = await adapter.exists(this.dataFile);
    if (!exists) {
      // 确保目录存在（当文件不在根目录时）
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

    // 读取并校验内容：如果为空或损坏，重置为 {}
    try {
      const content = await adapter.read(this.dataFile);
      // 允许空对象与空数组，其他必须为可解析 JSON
      if (!content || content.trim() === "") {
        await adapter.write(this.dataFile, JSON.stringify({}));
        return;
      }
      const parsed = JSON.parse(content);
      // 若不是对象，则重置为 {}
      if (
        parsed === null ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        await adapter.write(this.dataFile, JSON.stringify({}));
      }
    } catch (_) {
      // 解析失败或读取失败时，直接重置为 {}
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
      await this.ensureDataFile();
      const adapter = this.app.vault.adapter;

      // 将缓存转换为对象
      const data: Record<string, HistoryItem> = {};
      this.cache.forEach((item, id) => {
        data[id] = item;
      });

      const jsonData = JSON.stringify(data, null, 2);

      // 写入文件
      await adapter.write(this.dataFile, jsonData);

      // 验证文件是否写入成功
      const savedContent = await adapter.read(this.dataFile);
      const savedData = JSON.parse(savedContent);
      const savedItemCount = Object.keys(savedData).length;

      if (savedItemCount !== Object.keys(data).length) {
        throw new Error(
          `Data integrity check failed: expected ${
            Object.keys(data).length
          } items, but file contains ${savedItemCount} items`
        );
      }
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
    await this.loadFromFile();
    // 更新缓存
    this.cache.set(item.id, item);
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
   * 解析并设置数据文件路径
   * - 优先使用“插件名”为文件夹，例如：`<plugin>/chat-history.json`
   * - 插件名会被清洗为安全文件夹名（去除空格与特殊字符，转小写）
   * - 若解析失败，回退到根目录 `chat-history.json`
   */
  private async resolveDataFilePath(): Promise<void> {
    const adapter = this.app.vault.adapter;
    try {
      const safeFolder = this.normalizeFolderName(this.pluginFolderName);
      if (safeFolder) {
        this.dataFile = `${safeFolder}/chat-history.json`;
        // 确保目录存在
        const exists = await adapter.exists(safeFolder);
        if (!exists) {
          await adapter.mkdir(safeFolder);
        }
        return;
      }
      this.dataFile = "chat-history.json";
    } catch (e) {
      this.dataFile = "chat-history.json";
    }
  }

  /**
   * 清洗插件名为安全的文件夹名
   * - 输入：任意字符串（可能包含空格与特殊字符）
   * - 输出：只包含字母数字与连字符的小写名称
   */
  private normalizeFolderName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
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
    const basePath =
      adapter.basePath || adapter.path || this.app.vault.getName();
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
  async convertToNoteContexts(
    noteRefs: NoteReference[]
  ): Promise<NoteContext[]> {
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
