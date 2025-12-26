import { App } from "obsidian";
import { useState, useEffect, useCallback } from "react";
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

  const handleSuccessRole = useCallback(async (newRole: RoleItem) => {
    setRoles((prevRoles) => {
      // 如果是编辑模式，替换现有角色
      if (initRoleName && initRoleName !== newRole.name) {
        return prevRoles.map((role) =>
          role.name === initRoleName ? newRole : role,
        );
      }
      // 如果是新增模式，添加新角色
      const existingIndex = prevRoles.findIndex((r) => r.name === newRole.name);
      if (existingIndex >= 0) {
        // 如果已存在，替换它
        const updated = [...prevRoles];
        updated[existingIndex] = newRole;
        return updated;
      }
      // 否则添加新角色
      return [...prevRoles, newRole];
    });
    // TODO: 更新角色列表不及时，有问题
    // const roleList = await fetchRoles();
    // setRoles(roleList);
    externalSetSelectedRole(newRole);
    setIsRoleModalOpen(false);
  }, []);

  const handleCancelRole = useCallback(() => {
    setIsRoleModalOpen(false);
  }, []);

  const [initRoleName, setInitRoleName] = useState<string>("");
  const [initRolePrompt, setInitRolePrompt] = useState<string>("");
  const renderRoleList = () => {
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

    return (
      <RoleList
        roles={roles}
        selectedRole={externalSelectedRole}
        addRole={addRole}
        editRole={editRole}
        deleteRole={deleteRole}
        selectRole={selectRole}
      />
    );
  };

  return {
    initRoleName,
    initRolePrompt,
    handleSuccessRole,
    isRoleModalOpen,
    handleCancelRole,
    renderRoleList,
  };
};
