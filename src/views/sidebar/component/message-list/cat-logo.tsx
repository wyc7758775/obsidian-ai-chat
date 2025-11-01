import styles from "../../css/cat-logo.module.css";

/**
 * 渲染空状态下的猫猫 Logo。
 * 采用独立 CSS 模块（cat-logo.module.css），
 * 使用白色主体配色，并包含轻微浮动与基础表情动画。
 */
export const CatLogo = () => (
  <div className={styles.logo}>
    <svg style={{ position: "absolute", width: 0, height: 0 }}>
      <filter id="pencilTexture">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.7"
          numOctaves="3"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="3"
          xChannelSelector="R"
          yChannelSelector="G"
          result="pencil"
        />
        <feGaussianBlur in="pencil" stdDeviation="0.2" result="blurred" />
        <feBlend in="SourceGraphic" in2="blurred" mode="multiply" />
      </filter>
    </svg>
    <div className={styles.container}>
      <div className={styles.cat}>
        <div className={styles.head}>
          <div className={`${styles.ear} ${styles.left}`}></div>
          <div className={`${styles.ear} ${styles.right}`}></div>
          <div className={`${styles.eye} ${styles.left}`}></div>
          <div className={`${styles.eye} ${styles.right}`}></div>
          <div className={styles.nose}></div>
          <div className={`${styles.mouth} ${styles.left}`}></div>
          <div className={`${styles.mouth} ${styles.right}`}></div>
          <div className={`${styles.whisker} ${styles.left1}`}></div>
          <div className={`${styles.whisker} ${styles.left2}`}></div>
          <div className={`${styles.whisker} ${styles.right1}`}></div>
          <div className={`${styles.whisker} ${styles.right2}`}></div>
          <div className={`${styles.blush} ${styles.left}`}></div>
          <div className={`${styles.blush} ${styles.right}`}></div>
        </div>
        <div className={styles.body}>
          <div className={styles.heart}></div>
        </div>
        <div className={styles.tail}></div>
      </div>
    </div>
    <div className={styles.gameText}>No messages, start a conversation!</div>
  </div>
);
