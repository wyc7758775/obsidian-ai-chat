import React from "react";
import { HistoryItem } from "../type";
import { SaveIcon, CancelIcon } from "./icon";
import styles from "../css/edit-history-modal.module.css";

interface EditHistoryModalProps {
  isOpen: boolean;
  historyItem: HistoryItem | null;
  editTitle: string;
  editSystemMessage: string;
  onTitleChange: (title: string) => void;
  onSystemMessageChange: (message: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const EditHistoryModal: React.FC<EditHistoryModalProps> = ({
  isOpen,
  historyItem,
  editTitle,
  editSystemMessage,
  onTitleChange,
  onSystemMessageChange,
  onSave,
  onCancel,
}) => {
  if (!isOpen || !historyItem) {
    return null;
  }

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
          <h3 className={styles.modalTitle}>编辑历史记录</h3>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>标题:</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="历史记录标题"
              className={styles.fieldInput}
              autoFocus
            />
          </div>
          
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>AI系统信息:</label>
            <textarea
              value={editSystemMessage}
              onChange={(e) => onSystemMessageChange(e.target.value)}
              placeholder="AI系统提示信息"
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
            <CancelIcon />
            <span>取消</span>
          </button>
          <button 
            className={`${styles.modalButton} ${styles.saveButton}`}
            onClick={onSave}
          >
            <SaveIcon />
            <span>保存</span>
          </button>
        </div>
      </div>
    </div>
  );
};