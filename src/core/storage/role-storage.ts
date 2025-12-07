import { App } from "obsidian";

export interface RoleItem {
  name: string;
  systemPrompt: string;
}

// TODO: json 改为 md 格式作为存储。
/**
 * 角色存储服务：在与 chat-history.json 同级创建 chat-roles.json，用于保存角色名称与系统提示语。
 * 仅保存轻量字段：name 与 systemPrompt。
 */
export class RoleStorageService {
  private app: App;
  private rolesFile = "chat-roles.json"; // 默认文件名，最终路径由插件文件夹名决定
  private cache: RoleItem[] = [];
  private isLoaded = false;

  private pluginFolderName: string;

  /**
   * 构造函数：注入 Obsidian App 与插件名
   * - 输入：`app`、`pluginFolderName`（未清洗）
   * - 输出：无
   * - 边界处理：未提供插件名时回退为 `obsidian-plugin`
   */
  constructor(app: App, pluginFolderName?: string) {
    this.app = app;
    this.pluginFolderName = pluginFolderName || "obsidian-plugin";
  }

  /**
   * 确保角色文件存在；若不存在则创建默认角色
   */
  private async ensureRolesFile(): Promise<void> {
    const adapter = this.app.vault.adapter;
    // 解析路径并确保目录存在
    await this.resolveRolesFilePath();
    const exists = await adapter.exists(this.rolesFile);
    if (!exists) {
      const defaultRoles: RoleItem[] = [
        {
          name: "默认角色",
          systemPrompt: "你是一个温柔可靠的助手，专注于写作优化与总结。",
        },
      ];
      await adapter.write(
        this.rolesFile,
        JSON.stringify(defaultRoles, null, 2),
      );
    }
    // 内容校验：空或损坏则重置为默认角色
    try {
      const content = await adapter.read(this.rolesFile);
      if (!content || content.trim() === "") {
        const defaults: RoleItem[] = [
          {
            name: "默认角色",
            systemPrompt: "你是一个温柔可靠的助手，专注于写作优化与总结。",
          },
        ];
        await adapter.write(this.rolesFile, JSON.stringify(defaults, null, 2));
        return;
      }
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        const defaults: RoleItem[] = [
          {
            name: "默认角色",
            systemPrompt: "你是一个温柔可靠的助手，专注于写作优化与总结。",
          },
        ];
        await adapter.write(this.rolesFile, JSON.stringify(defaults, null, 2));
      }
    } catch (_) {
      const defaults: RoleItem[] = [
        {
          name: "默认角色",
          systemPrompt: "你是一个温柔可靠的助手，专注于写作优化与总结。",
        },
      ];
      await adapter.write(this.rolesFile, JSON.stringify(defaults, null, 2));
    }
  }

  /** 加载角色列表到缓存 */
  private async loadFromFile(): Promise<void> {
    if (this.isLoaded) return;
    await this.ensureRolesFile();
    const adapter = this.app.vault.adapter;
    try {
      const content = await adapter.read(this.rolesFile);
      const data = JSON.parse(content) as RoleItem[];
      this.cache = Array.isArray(data) ? data : [];
    } catch (e) {
      console.error("[RoleStorage] Failed to load roles:", e);
      this.cache = [];
    } finally {
      this.isLoaded = true;
    }
  }

  /** 保存缓存到文件 */
  private async saveToFile(): Promise<void> {
    await this.ensureRolesFile();
    const adapter = this.app.vault.adapter;
    await adapter.write(this.rolesFile, JSON.stringify(this.cache, null, 2));
  }

  /**
   * 解析并设置角色文件路径：`<plugin>/chat-roles.json`
   * - 清洗插件名为安全文件夹名
   * - 确保目录存在
   */
  private async resolveRolesFilePath(): Promise<void> {
    const adapter = this.app.vault.adapter;
    const safeFolder = this.normalizeFolderName(this.pluginFolderName);
    if (safeFolder) {
      const exists = await adapter.exists(safeFolder);
      if (!exists) {
        await adapter.mkdir(safeFolder);
      }
      this.rolesFile = `${safeFolder}/chat-roles.json`;
      return;
    }
    this.rolesFile = "chat-roles.json";
  }

  /** 将字符串清洗为安全的文件夹名 */
  private normalizeFolderName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  /** 获取全部角色 */
  async fetchRoles(): Promise<RoleItem[]> {
    await this.loadFromFile();
    return [...this.cache];
  }

  /** 覆盖保存全部角色（用于设置页批量更新） */
  async saveRoles(roles: RoleItem[]): Promise<void> {
    this.cache = roles.slice(0, 50); // 安全限制
    await this.saveToFile();
  }

  /** 添加或更新单个角色 */
  async upsertRole(role: RoleItem): Promise<void> {
    await this.loadFromFile();
    const idx = this.cache.findIndex((r) => r.name === role.name);
    if (idx >= 0) this.cache[idx] = role;
    else this.cache.push(role);
    await this.saveToFile();
  }

  /** 删除角色 */
  async deleteRoleByName(name: string): Promise<void> {
    await this.loadFromFile();
    this.cache = this.cache.filter((r) => r.name !== name);
    await this.saveToFile();
  }

  /** 获取默认角色（列表第一位） */
  async getDefaultRole(): Promise<RoleItem | null> {
    await this.loadFromFile();
    return this.cache.length > 0 ? this.cache[0] : null;
  }
}
