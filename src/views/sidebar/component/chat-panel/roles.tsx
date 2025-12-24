import { App, Notice } from "obsidian";
import { useState, useEffect, useCallback } from "react";
import { useContext } from "../../hooks/use-context";

import type { RoleItem } from "../../../../core/storage/role-storage";
import { RoleList } from "./role-list";

export const useRoles = (
  app: App,
  externalSelectedRole: RoleItem | null,
  externalSetSelectedRole: (role: RoleItem | null) => void,
) => {
  const { fetchRoles, upsertRole, deleteRoleByName } = useContext(app);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const [roleNameInput, setRoleNameInput] = useState("");

  const [rolePromptInput, setRolePromptInput] = useState("");
  // TODO: 已经没有必要存在了
  const [editingRoleOriginalName, setEditingRoleOriginalName] = useState<
    string | null
  >(null);

  useEffect(() => {
    const loadRoles = async () => {
      const roleList = await fetchRoles();
      setRoles(roleList);
      // 安全地检查 selectedRole，避免在初始化前访问
      if (externalSelectedRole === null || externalSelectedRole === undefined) {
        externalSetSelectedRole(roleList[0] ?? null);
      }
    };
    loadRoles();
  }, [fetchRoles]);

  const handleSaveRole = useCallback(async () => {
    const name = roleNameInput.trim();
    const prompt = rolePromptInput.trim();
    if (!name || !prompt) {
      new Notice("请填写角色名称与系统提示语");
      return;
    }
    const newRole = { name, systemPrompt: prompt } as RoleItem;
    try {
      if (editingRoleOriginalName && editingRoleOriginalName !== name) {
        await deleteRoleByName(editingRoleOriginalName);
      }
      await upsertRole(newRole);
      const roleList = await fetchRoles();
      setRoles(roleList);
      externalSetSelectedRole(newRole);
      setIsRoleModalOpen(false);
      setEditingRoleOriginalName(null);
      new Notice("角色已保存");
    } catch (e) {
      console.error("保存角色失败:", e);
      new Notice("保存角色失败");
    }
  }, [
    roleNameInput,
    rolePromptInput,
    editingRoleOriginalName,
    deleteRoleByName,
    upsertRole,
    fetchRoles,
  ]);

  const handleCancelRole = useCallback(() => {
    setIsRoleModalOpen(false);
    setEditingRoleOriginalName(null);
  }, []);

  const renderRoleList = () => {
    const addRole = () => {
      setRoleNameInput("");
      setRolePromptInput("");
      setEditingRoleOriginalName(null);
      setIsRoleModalOpen(true);
    };
    const editRole = (role: RoleItem) => {
      setRoleNameInput(role.name);
      setRolePromptInput(role.systemPrompt);
      setEditingRoleOriginalName(role.name);
      setIsRoleModalOpen(true);
    };
    const deleteRole = async (role: RoleItem) => {
      await deleteRoleByName(role.name);
      const roleList = await fetchRoles();
      setRoles(roleList);
      // 安全地检查 selectedRole
      if (externalSelectedRole && externalSelectedRole.name === role.name) {
        externalSetSelectedRole(roleList[0] ?? null);
      }
    };
    const selectRole = (role: RoleItem) => {
      externalSetSelectedRole(role);
    };
    return (
      <RoleList
        roles={roles}
        selectedRole={externalSelectedRole}
        addRole={addRole}
        editRole={editRole}
        deleteRole={deleteRole}
        selectRole={selectRole}
      />
    );
  };

  return {
    roles,
    isRoleModalOpen,
    setIsRoleModalOpen,
    editingRoleOriginalName,
    roleNameInput,
    setRoleNameInput,
    rolePromptInput,
    setRolePromptInput,
    handleSaveRole,
    handleCancelRole,
    renderRoleList,
  };
};
