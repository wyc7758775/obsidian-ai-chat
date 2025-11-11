import { App, TFile, Vault, Notice, TFolder } from "obsidian";

export type IconType = "file" | "folder";
export interface NoteContext {
  file?: TFile | TFolder;
  title?: string;
  iconType?: IconType;
  name?: string;
  content?: string;
  path?: string;
  tags?: string[];
  links?: string[];
}

export class NoteContextService {
  private app: App;
  private vault: Vault;

  constructor(app: App) {
    this.app = app;
    this.vault = app.vault;
  }

  // 允许通过 TFile、轻量 NoteContext 或 path 字符串解析为 TFile
  private resolveToFile(input?: TFile | NoteContext | string): TFile | null {
    if (!input) return null;
    if (typeof input === "string") {
      const abs = this.vault.getAbstractFileByPath(input);
      return abs && abs instanceof TFile ? abs : null;
    }
    const obj: any = input;
    // 如果看起来就是 TFile（有 stat/path），直接返回
    if (obj?.stat && obj?.path) return obj as TFile;
    const path = obj?.path ?? obj?.file?.path;
    if (!path) return null;
    const abs = this.vault.getAbstractFileByPath(path);
    return abs && abs instanceof TFile ? abs : null;
  }

  // 获取所有笔记列表
  async getAllNotes(): Promise<TFile[]> {
    return this.vault.getMarkdownFiles();
  }

  // 根据路径获取笔记内容
  async getNoteContent(
    fileOrCtx?: TFile | NoteContext | string
  ): Promise<NoteContext | null | string> {
    if (!fileOrCtx) return "";
    try {
      const file = this.resolveToFile(fileOrCtx);
      if (!file) return "";
      const content = await this.vault.read(file);
      const cache = this.app.metadataCache.getFileCache(file);

      return {
        file,
        title: file.basename,
        content: this.cleanContent(content),
        path: file.path,
        tags: cache?.tags?.map((tag) => tag.tag) || [],
        links: cache?.links?.map((link) => link.link) || [],
      };
    } catch (error) {
      console.error("获取笔记内容失败:", error);
      return null;
    }
  }

  // 清理内容（移除 Obsidian 特殊语法）
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

  // 搜索笔记
  async searchNotes(query: string): Promise<TFile[]> {
    const allFiles = await this.getAllNotes();
    const searchResults: TFile[] = [];

    for (const file of allFiles) {
      if (file.basename.toLowerCase().includes(query.toLowerCase())) {
        searchResults.push(file);
        continue;
      }

      try {
        const content = await this.vault.read(file);
        if (content.toLowerCase().includes(query.toLowerCase())) {
          searchResults.push(file);
        }
      } catch (error) {
        console.error("搜索文件失败:", file.path, error);
      }
    }

    return searchResults;
  }

  // 获取当前活动笔记
  getCurrentNote(): TFile | null {
    const activeFile = this.app.workspace.getActiveFile();
    return activeFile && activeFile.extension === "md" ? activeFile : null;
  }

  // 获取当前打开的笔记
  getOpenNotes = (): NoteContext[] => {
    const openFiles: NoteContext[] = [];

    // 获取所有打开的叶子节点
    const leaves = this.app.workspace.getLeavesOfType("markdown");

    for (const leaf of leaves) {
      const view = leaf.view;
      if (view && "file" in view && view.file) {
        const file = view.file as TFile;
        openFiles.push({
          title: file.basename,
          file: file,
          iconType: "file",
        });
      }
    }

    // 获取当前文件夹
    const currentFolder = this.getCurrentBrowsingFolder();
    if (currentFolder) {
      // 避免重复添加根目录
      const isRoot = currentFolder.path === "/";
      const alreadyExists = openFiles.some(
        (item) => item.file?.path === currentFolder.path
      );
      if (!alreadyExists) {
        openFiles.unshift({
          title: isRoot ? this.app.vault.getName() : currentFolder.name,
          file: currentFolder,
          iconType: "folder",
        });
      }
    }

    return openFiles;
  };

  // 获取“当前被浏览的文件夹”
  // 规则：若存在活跃文件，则返回其直接父文件夹；
  //      否则返回 vault 根目录。
  getCurrentBrowsingFolder = (): TFolder | null => {
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile) {
      return activeFile.parent ?? this.app.vault.getRoot();
    }
    // 没有任何文件被打开时，返回根
    return this.app.vault.getRoot();
  };

  // 获取相关笔记（基于链接和标签）
  async getRelatedNotes(file: TFile, limit = 5): Promise<TFile[]> {
    const cache = this.app.metadataCache.getFileCache(file);
    const relatedFiles = new Set<TFile>();

    // 基于链接的相关笔记
    if (cache?.links) {
      for (const link of cache.links) {
        const linkedFile = this.app.metadataCache.getFirstLinkpathDest(
          link.link,
          file.path
        );
        if (linkedFile) {
          relatedFiles.add(linkedFile);
        }
      }
    }

    // 基于标签的相关笔记
    if (cache?.tags) {
      const tags = cache.tags.map((tag) => tag.tag);
      const allFiles = await this.getAllNotes();

      for (const otherFile of allFiles) {
        if (otherFile.path === file.path) continue;

        const otherCache = this.app.metadataCache.getFileCache(otherFile);
        if (otherCache?.tags) {
          const otherTags = otherCache.tags.map((tag) => tag.tag);
          const hasCommonTag = tags.some((tag) => otherTags.includes(tag));
          if (hasCommonTag) {
            relatedFiles.add(otherFile);
          }
        }
      }
    }

    return Array.from(relatedFiles).slice(0, limit);
  }

  // 获取笔记统计信息
  async getNoteStats(): Promise<{
    totalNotes: number;
    totalWords: number;
    totalCharacters: number;
  }> {
    const allNotes = await this.getAllNotes();
    let totalWords = 0;
    let totalCharacters = 0;

    for (const file of allNotes) {
      try {
        const content = await this.vault.read(file);
        const cleanedContent = this.cleanContent(content);
        totalCharacters += cleanedContent.length;
        totalWords += cleanedContent
          .split(/\s+/)
          .filter((word) => word.length > 0).length;
      } catch (error) {
        console.error("读取文件失败:", file.path, error);
      }
    }

    return {
      totalNotes: allNotes.length,
      totalWords,
      totalCharacters,
    };
  }

  /**
   * 打开笔记（函数级注释）
   * - 功能：根据传入的 TFile/NoteContext/path 解析目标文件，并在 Obsidian 中打开。
   * - 输入有效性：当无法解析到文件或路径为空时返回 false；支持 markdown 及其他可打开类型。
   * - 特殊情况处理：若当前已打开同一笔记，仍获取新叶子打开，以保持默认行为一致；异常时捕获并提示。
   */
  async openNote(fileOrCtx?: TFile | NoteContext | string): Promise<boolean> {
    try {
      const file = this.resolveToFile(fileOrCtx);
      if (!file) {
        new Notice("无法打开：未找到对应文件");
        return false;
      }
      const leaf = this.app.workspace.getLeaf(true);
      await (leaf as any)?.openFile?.(file);
      return true;
    } catch (error) {
      console.error("打开笔记失败:", error);
      new Notice("打开笔记失败");
      return false;
    }
  }

  // 按文件夹分组获取笔记
  async getNotesByFolder(): Promise<Map<string, TFile[]>> {
    const allNotes = await this.getAllNotes();
    const folderMap = new Map<string, TFile[]>();

    for (const file of allNotes) {
      const folder = file.parent?.path || "根目录";
      if (!folderMap.has(folder)) {
        folderMap.set(folder, []);
      }
      folderMap.get(folder)!.push(file);
    }

    return folderMap;
  }

  // 按标签分组获取笔记
  async getNotesByTag(): Promise<Map<string, TFile[]>> {
    const allNotes = await this.getAllNotes();
    const tagMap = new Map<string, TFile[]>();

    for (const file of allNotes) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.tags) {
        for (const tag of cache.tags) {
          const tagName = tag.tag;
          if (!tagMap.has(tagName)) {
            tagMap.set(tagName, []);
          }
          tagMap.get(tagName)!.push(file);
        }
      }
    }

    return tagMap;
  }

  // 获取最近修改的笔记
  async getRecentlyModifiedNotes(limit = 10): Promise<TFile[]> {
    const allNotes = await this.getAllNotes();
    return allNotes.sort((a, b) => b.stat.mtime - a.stat.mtime).slice(0, limit);
  }

  // 获取最近创建的笔记
  async getRecentlyCreatedNotes(limit = 10): Promise<TFile[]> {
    const allNotes = await this.getAllNotes();
    return allNotes.sort((a, b) => b.stat.ctime - a.stat.ctime).slice(0, limit);
  }

  // this.app.vault 在 obsidian 的 ts 类型中没有定义，实际在运行时是存在的
  private getVaultConfig<T>(key: string): T | undefined {
    const vaultAny = this.app.vault as unknown as {
      getConfig?: (k: string) => T;
    };
    try {
      return typeof vaultAny.getConfig === "function"
        ? vaultAny.getConfig(key)
        : undefined;
    } catch {
      return undefined;
    }
  }
  getNewNoteTargetFolder(): string {
    const location = this.getVaultConfig<string>("newFileLocation");

    if (location === "folder") {
      const folder = this.getVaultConfig<string>("newFileFolderPath");
      return folder ?? "";
    }

    if (location === "current") {
      const active = this.app.workspace.getActiveFile();
      if (active) {
        const lastSlash = active.path.lastIndexOf("/");
        if (lastSlash >= 0) {
          return active.path.substring(0, lastSlash);
        }
      }
      // 没有活动文件时回退到根目录
      return "";
    }

    // root 或未知值：使用 Vault 根目录
    return "";
  }

  /**
   * 创建新笔记（统一返回 Promise 结果对象）
   *
   * 边界与有效性处理：
   * - 如果 title 为空或全空白，使用默认标题 "新笔记"。
   * - 清理标题中不合法的文件名字符（如 / \ : * ? " < > |）。
   * - 按用户设置的“新建笔记默认位置”生成路径；支持传入覆盖路径。
   * - 若目标路径已存在同名文件，则返回失败结果而非抛异常。
   * - 成功与失败均以 { success, file?, error?, fullPath } 形式返回，不抛出异常。
   */
  async createNote(context: NoteContext): Promise<{
    success: boolean;
    file?: TFile;
    error?: string;
    fullPath: string;
  }> {
    const rawTitle = (context.title ?? "新笔记").trim();
    // 清理非法文件名字符
    const safeTitle = rawTitle
      ? rawTitle.replace(/[\\/:*?"<>|]/g, "-")
      : "新笔记";

    const content = context.content ?? "";
    const fileName = `${safeTitle}.md`;

    // 动态遵循用户“新建笔记默认位置”的设置
    const targetFolder = context.path ?? this.getNewNoteTargetFolder();
    const fullPath = targetFolder ? `${targetFolder}/${fileName}` : fileName;

    try {
      const existed = this.vault.getAbstractFileByPath(fullPath);
      if (existed instanceof TFile) {
        const msg = `创建笔记失败：已存在同名文件 (${fullPath})`;
        new Notice(msg);
        return { success: false, error: msg, fullPath };
      }
      new Notice("创建笔记成功!");

      const file = await this.vault.create(fullPath, content);
      return { success: true, file, fullPath };
    } catch (err: unknown) {
      const msg = `创建笔记失败: ${
        err instanceof Error ? err.message : String(err)
      }`;
      new Notice(msg);
      return { success: false, error: msg, fullPath };
    }
  }
}
