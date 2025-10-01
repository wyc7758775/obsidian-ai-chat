import { App, TFile, Vault, Notice } from "obsidian";

export interface NoteContext {
  file?: TFile;
  title?: string;
  icon?: string;
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

  // 获取所有笔记列表
  async getAllNotes(): Promise<TFile[]> {
    return this.vault.getMarkdownFiles();
  }

  // 根据路径获取笔记内容
  async getNoteContent(file?: TFile): Promise<NoteContext | null | string> {
    if (!file) {
      return "";
    }
    try {
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
          icon: "📄", // 默认文档图标
        });
      }
    }

    return openFiles;
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

  // 创建新笔记
  async createNote(context: NoteContext): Promise<TFile> {
    const { title = "新笔记", content = "", path } = context;
    const fileName = `${title}.md`;

    // 动态遵循用户“新建笔记默认位置”的设置
    const targetFolder = path ?? this.getNewNoteTargetFolder();
    const fullPath = targetFolder ? `${targetFolder}/${fileName}` : fileName;
    console.log({ targetFolder, fullPath });

    try {
      return await this.vault.create(fullPath, content);
    } catch (err: unknown) {
      new Notice(
        `创建笔记失败: ${err instanceof Error ? err.message : String(err)}`
      );
      throw err;
    }
  }
}
