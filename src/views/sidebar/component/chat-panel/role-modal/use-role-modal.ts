import { useState } from "react";
import { App, Notice } from "obsidian";
import type { RoleItem } from "../../../../../core/storage/role-storage";
import { useContext } from "../../../hooks/use-context";

export const useRoleModal = ({
  app,
  initRoleName,
  onCancel,
}: {
  app: App;
  initRoleName?: string;
  readonly onCancel: () => void;
}) => {
  const [roleName, setRoleName] = useState(initRoleName || "");
  const [rolePrompt, setRolePrompt] = useState("");

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

  const onSave = async (successCallBack: () => void) => {
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
      successCallBack();
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
  };
};
