import { App } from "obsidian";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useContext } from "../../hooks/use-context";

import type { RoleItem } from "../../../../core/storage/role-storage";
import { RoleList } from "./role-list";

export const useRoles = (
  app: App,
  externalSelectedRole: RoleItem | null,
  externalSetSelectedRole: (role: RoleItem | null) => void,
) => {
  const { fetchRoles, deleteRoleByName } = useContext(app);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  useEffect(() => {
    const loadRoles = async () => {
      const roleList = await fetchRoles();
      setRoles(roleList);
      // 安全地检查 selectedRole，避免在初始化前访问
      if (externalSelectedRole === null || externalSelectedRole === undefined) {
        externalSetSelectedRole(roleList[0] ?? null);
      }
    };
    loadRoles();
  }, [fetchRoles]);

  const handleSuccessRole = useCallback(
    async (newRole: RoleItem) => {
      // 重新获取最新的角色列表
      const updatedRoles = await fetchRoles();
      setRoles(updatedRoles);
      externalSetSelectedRole(newRole);
      setIsRoleModalOpen(false);
    },
    [fetchRoles, externalSetSelectedRole],
  );

  const handleCancelRole = useCallback(() => {
    setIsRoleModalOpen(false);
  }, []);

  const [initRoleName, setInitRoleName] = useState<string>("");
  const [initRolePrompt, setInitRolePrompt] = useState<string>("");
  const RoleListComponent = useMemo(() => {
    const addRole = () => {
      return setIsRoleModalOpen(true);
    };
    const editRole = (role: RoleItem) => {
      setInitRoleName(role.name);
      setInitRolePrompt(role.systemPrompt);

      return setIsRoleModalOpen(true);
    };
    const deleteRole = async (role: RoleItem) => {
      await deleteRoleByName(role.name);
      const roleList = await fetchRoles();
      setRoles(roleList);
      // 安全地检查 selectedRole
      if (externalSelectedRole && externalSelectedRole.name === role.name) {
        externalSetSelectedRole(roleList[0] ?? null);
      }
    };
    const selectRole = (role: RoleItem) => {
      externalSetSelectedRole(role);
    };

    return () => (
      <RoleList
        roles={roles}
        selectedRole={externalSelectedRole}
        addRole={addRole}
        editRole={editRole}
        deleteRole={deleteRole}
        selectRole={selectRole}
      />
    );
  }, [roles, externalSelectedRole]);

  return {
    initRoleName,
    initRolePrompt,
    handleSuccessRole,
    isRoleModalOpen,
    handleCancelRole,
    RoleListComponent,
  };
};
