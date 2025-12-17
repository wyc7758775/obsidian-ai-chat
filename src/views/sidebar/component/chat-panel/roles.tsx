import { App, Notice } from "obsidian";
import { useState, useEffect } from "react";
import { useContext } from "../../hooks/use-context";

import type { RoleItem } from "../../../../core/storage/role-storage";
import styles from "./css/styles.module.css";
import {
  PersonIcon,
  EditIcon,
  AddSmallIcon,
  CloseIcon,
} from "../../../../ui/icon";
// TODO: 做到这里
// import { RoleList } from "./role-list";

export const useRoles = (app: App) => {
  const { fetchRoles, upsertRole, deleteRoleByName } = useContext(app);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [roleNameInput, setRoleNameInput] = useState("");
  const [rolePromptInput, setRolePromptInput] = useState("");
  const [editingRoleOriginalName, setEditingRoleOriginalName] = useState<
    string | null
  >(null);

  useEffect(() => {
    const loadRoles = async () => {
      const roleList = await fetchRoles();
      setRoles(roleList);
      if (!selectedRole) {
        setSelectedRole(roleList[0] ?? null);
      }
    };
    loadRoles();
  }, [fetchRoles]);

  const handleSaveRole = async () => {
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
      setSelectedRole(newRole);
      setIsRoleModalOpen(false);
      setEditingRoleOriginalName(null);
      new Notice("角色已保存");
    } catch (e) {
      console.error("保存角色失败:", e);
      new Notice("保存角色失败");
    }
  };

  const handleCancelRole = () => {
    setIsRoleModalOpen(false);
    setEditingRoleOriginalName(null);
  };

  const renderRoleList = () => {
    const roleItem = (role: RoleItem, index: number) => {
      const isActive = role.name === selectedRole?.name;

      return (
        <div
          className={`${styles.historyFoldItem} ${
            isActive ? styles.historyFoldItemActive : ""
          }`}
          key={index}
          onClick={() => setSelectedRole(role)}
        >
          <PersonIcon />
          <div className={styles.historyFoldText}>{role.name}</div>
          <div className={styles.historyFoldActions}>
            <EditIcon
              onClick={(e?: React.MouseEvent) => {
                e?.stopPropagation();
                setRoleNameInput(role.name);
                setRolePromptInput(role.systemPrompt);
                setEditingRoleOriginalName(role.name);
                setIsRoleModalOpen(true);
              }}
            />
            <CloseIcon
              onClick={async (e?: React.MouseEvent) => {
                e?.stopPropagation();
                await deleteRoleByName(role.name);
                const roleList = await fetchRoles();
                setRoles(roleList);
                if (selectedRole?.name === role.name) {
                  setSelectedRole(roleList[0] ?? null);
                }
              }}
            />
          </div>
        </div>
      );
    };

    return (
      <div className={styles.historyFoldList}>
        {roles.map((role: RoleItem, index: number) => roleItem(role, index))}
        <div
          className={styles.historyFoldItem}
          onClick={() => {
            setRoleNameInput("");
            setRolePromptInput("");
            setEditingRoleOriginalName(null);
            setIsRoleModalOpen(true);
          }}
        >
          <AddSmallIcon />
          <div className={styles.historyFoldText}>新增角色</div>
        </div>
      </div>
    );
  };

  return {
    roles,
    selectedRole,
    setSelectedRole,
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
