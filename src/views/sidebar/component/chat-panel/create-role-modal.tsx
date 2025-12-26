import React, { useCallback } from "react";
import { Notice } from "obsidian";
import { RoleModal, RoleModalProps } from "./role-modal";

export interface RoleModalCallbacks {
  /** 角色名称变化回调 */
  onNameChange: (name: string) => void;
  /** 系统提示语变化回调 */
  onPromptChange: (prompt: string) => void;
  /** 保存回调 */
  onSave: () => void;
  /** 取消回调 */
  onCancel: () => void;
}

export type CreateRoleModalOptions = RoleModalCallbacks;

export const createRoleModal = (options: CreateRoleModalOptions) => {
  const { onNameChange, onPromptChange, onSave, onCancel } = options;

  /**
   * 预配置的 RoleModal 组件
   * 只需要传递数据 props，回调已经绑定
   */
  return function PreconfiguredRoleModal(
    props: Pick<RoleModalProps, "roleName" | "rolePrompt">,
  ) {
    const { roleName, rolePrompt } = props;

    const handleCancel = useCallback(() => {
      onCancel();
    }, [onCancel]);

    const handleSave = useCallback(() => {
      if (!roleName.trim()) {
        new Notice("角色不能为空");
        return;
      }
      onSave();
    }, [onSave, roleName]);

    return (
      <RoleModal
        roleName={roleName}
        rolePrompt={rolePrompt}
        onNameChange={onNameChange}
        onPromptChange={onPromptChange}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  };
};
