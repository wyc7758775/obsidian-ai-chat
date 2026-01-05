import styles from "../../css/message-list.module.css";
import cat from "./cat.png";

export const messageEmptyRender = () => {
  return (
    <div className={styles.emptyWrap}>
      <img className={styles.catWrapper} src={cat} alt="Image" />
    </div>
  );
};
