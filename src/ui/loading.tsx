import React from "react";
import styles from "../views/sidebar/css/loading.module.css";

export const Loading: React.FC = () => {
  return (
    <div className={styles.loadingOverlay}>
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}>
          <div className={styles.spinnerRing}></div>
          <div className={styles.spinnerRing}></div>
          <div className={styles.spinnerRing}></div>
        </div>
        <div className={styles.loadingText}>正在加载数据...</div>
      </div>
    </div>
  );
};