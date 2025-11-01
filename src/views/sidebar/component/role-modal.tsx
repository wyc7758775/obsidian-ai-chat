import React from "react";
import styles from "../css/edit-history-modal.module.css";

export interface RoleModalProps {
  isOpen: boolean;
  roleName: string;
  rolePrompt: string;
  onNameChange: (name: string) => void;
  onPromptChange: (prompt: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * 角色新增/编辑弹窗组件：用于创建角色名称与系统提示语。
 * 使用现有的弹窗样式，保持与历史编辑一致的视觉风格。
 */
export const RoleModal: React.FC<RoleModalProps> = ({
  isOpen,
  roleName,
  rolePrompt,
  onNameChange,
  onPromptChange,
  onSave,
  onCancel,
}) => {
  if (!isOpen) return null;

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

  return (
    <div
      className={styles.modalBackdrop}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>新增角色</h3>
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