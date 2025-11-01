import { App } from "obsidian";

export interface RoleItem {
  name: string;
  systemPrompt: string;
}

/**
 * 角色存储服务：在与 chat-history.json 同级创建 chat-roles.json，用于保存角色名称与系统提示语。
 * 仅保存轻量字段：name 与 systemPrompt。
 */
export class RoleStorageService {
  private app: App;
  private rolesFile = "chat-roles.json"; // 与 chat-history.json 同级（vault 根目录）
  private cache: RoleItem[] = [];
  private isLoaded = false;

  constructor(app: App) {
    this.app = app;
  }

  /**
   * 确保角色文件存在；若不存在则创建默认角色
   */
  private async ensureRolesFile(): Promise<void> {
    const adapter = this.app.vault.adapter;
    const exists = await adapter.exists(this.rolesFile);
    if (!exists) {
      const defaultRoles: RoleItem[] = [
        { name: "默认角色", systemPrompt: "你是一个温柔可靠的助手，专注于写作优化与总结。" },
      ];
      await adapter.write(this.rolesFile, JSON.stringify(defaultRoles, null, 2));
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
    if (idx >= 0) this.cache[idx] = role; else this.cache.push(role);
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