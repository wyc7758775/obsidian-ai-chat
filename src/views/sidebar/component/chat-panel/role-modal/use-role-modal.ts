import { useState, useEffect } from "react";
import { App, Notice } from "obsidian";
import type { RoleItem } from "../../../../../core/storage/role-storage";
import { useContext } from "../../../hooks/use-context";

export const useRoleModal = ({
  app,
  initRoleName,
  initRolePrompt,
  onCancel,
}: {
  app: App;
  initRoleName?: string;
  initRolePrompt?: string;
  readonly onCancel: () => void;
}) => {
  const [roleName, setRoleName] = useState("");
  const onNameChange = (name: string) => {
    setRoleName(name);
  };
  const [rolePrompt, setRolePrompt] = useState(initRolePrompt || "");
  const onPromptChange = (prompt: string) => {
    setRolePrompt(prompt);
  };

  useEffect(() => {
    if (initRoleName !== undefined && initRoleName !== roleName) {
      setRoleName(initRoleName);
    }
    if (initRolePrompt !== undefined && initRolePrompt !== rolePrompt) {
      setRolePrompt(initRolePrompt);
    }
  }, [initRoleName, initRolePrompt]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };

  const { upsertRole, deleteRoleByName } = useContext(app);

  const onSave = async (onSuccess: (newRole: RoleItem) => void) => {
    const name = roleName.trim();
    const prompt = rolePrompt.trim();
    if (!name || !prompt) {
      new Notice("请填写角色名称与系统提示语");
      return;
    }

    const newRole = { name, systemPrompt: prompt } as RoleItem;
    try {
      if (initRoleName && initRoleName !== name) {
        await deleteRoleByName(initRoleName);
      }
      await upsertRole(newRole);
      onSuccess(newRole);
      new Notice("角色已保存");
    } catch (e) {
      console.error("保存角色失败:", e);
      new Notice("保存角色失败");
    }
  };

  return {
    roleName,
    rolePrompt,
    handleBackdropClick,
    handleKeyDown,
    onSave,
    onNameChange,
    onPromptChange,
  };
};
