import {
  PersonIcon,
  EditIcon,
  AddSmallIcon,
  CloseIcon,
} from "../../../../ui/icon";
import styles from "./css/styles.module.css";

import type { RoleItem } from "../../../../core/storage/role-storage";

export type RoleListProps = {
  roles: RoleItem[];
  selectedRole: RoleItem | null;
  addRole: () => void;
  editRole: (role: RoleItem) => void;
  deleteRole: (role: RoleItem) => void;
  selectRole: (role: RoleItem) => void;
};

export const RoleList = ({
  roles,
  selectedRole,
  addRole,
  editRole,
  deleteRole,
  selectRole,
}: RoleListProps) => {
  const roleItem = (role: RoleItem, index: number) => {
    const isActive = role.name === selectedRole?.name;

    return (
      <div
        className={`${styles.historyFoldItem} ${
          isActive ? styles.historyFoldItemActive : ""
        }`}
        key={index}
        onClick={() => selectRole(role)}
      >
        <PersonIcon />
        <div className={styles.historyFoldText}>{role.name}</div>
        <div className={styles.historyFoldActions}>
          <EditIcon
            onClick={(e?: React.MouseEvent) => {
              e?.stopPropagation();
              editRole(role);
            }}
          />
          <CloseIcon
            onClick={async (e?: React.MouseEvent) => {
              e?.stopPropagation();
              deleteRole(role);
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={styles.historyFoldList}>
      {roles.map((role: RoleItem, index: number) => roleItem(role, index))}
      <div
        className={styles.historyFoldItem}
        onClick={() => {
          addRole();
        }}
      >
        <AddSmallIcon />
        <div className={styles.historyFoldText}>新增角色</div>
      </div>
    </div>
  );
};
