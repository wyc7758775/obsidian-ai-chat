import React from 'react';
import styles from '../css/share-card.module.css';

interface ShareCardProps {
  question: React.ReactNode;
  answer: React.ReactNode;
}

const ShareCard: React.FC<ShareCardProps> = ({ question, answer }) => {
  return (
    <div className={styles.card}>
      <div className={styles.questionContainer}>
        <div className={styles.question}>{question}</div>
      </div>
      <div className={styles.answer}>{answer}</div>
      <div className={styles.footer}>
        <span>由 yoran 开发的 AI 聊天工具</span>
      </div>
    </div>
  );
};

export default ShareCard;