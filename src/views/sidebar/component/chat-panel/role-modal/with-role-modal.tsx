import React from "react";
import { App } from "obsidian";
import styles from "./css/role-modal.module.css";
import { useRoleModalLayout } from "./use-role-modal-layout";
import { useRoleModal } from "./use-role-modal";

export interface RoleModalProps {
  app: App;
  initRoleName: string;
  rolePrompt: string;
  onNameChange: (name: string) => void;
  onPromptChange: (prompt: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const RoleModal: React.FC<RoleModalProps> = ({
  app,
  initRoleName,
  rolePrompt,
  onNameChange,
  onPromptChange,
  onCancel,
}) => {
  const { onSave, roleName, handleBackdropClick, handleKeyDown } = useRoleModal(
    {
      onCancel,
      initRoleName,
      app,
    },
  );

  const { isEditMode } = useRoleModalLayout({ roleName });

  return (
    <div
      className={styles.modalBackdrop}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {isEditMode ? "编辑角色" : "新增角色"}
          </h3>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>角色名称:</label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="例如：写作助手"
              className={styles.fieldInput}
              autoFocus
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>系统提示语:</label>
            <textarea
              value={rolePrompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="用于该角色的系统消息"
              className={styles.fieldTextarea}
              rows={6}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            className={`${styles.modalButton} ${styles.cancelButton}`}
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className={`${styles.modalButton} ${styles.saveButton}`}
            onClick={onSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
