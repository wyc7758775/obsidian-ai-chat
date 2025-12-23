import styles from "./css/styles.module.css";
import {
  AddChatIcon,
  HistoryExpandIcon,
  RoleExpandIcon,
} from "../../../../ui/icon";

export const ActiveKey = {
  ROLES: "roles",
  HISTORY: "history",
  NONE: "none", // 不展示任何弹窗
} as const;

type ActiveKey = (typeof ActiveKey)[keyof typeof ActiveKey];

export interface WithActionsProps {
  activeKey: ActiveKey;
  currentRoleName: string | undefined;
  onExpand: (e: React.MouseEvent<HTMLElement>) => void;
  onAdd: () => void;
}

// TODO: i18n
export const WithActions = ({
  activeKey = ActiveKey.ROLES,
  currentRoleName = "",
  onExpand,
  onAdd,
}: WithActionsProps) => {
  return (
    <div className={styles.historyWrap}>
      <div className={styles.historyActions}>
        <RoleExpandIcon
          data-key="roles"
          active={activeKey === ActiveKey.ROLES}
          onClick={onExpand}
        />
        <HistoryExpandIcon
          data-key="history"
          active={activeKey === ActiveKey.HISTORY}
          onClick={onExpand}
        />
        <AddChatIcon onClick={onAdd} />
      </div>
      <div className={styles.currentRole}>
        <span>Person: </span>
        <span>{currentRoleName ?? "默认角色"}</span>
      </div>
    </div>
  );
};
