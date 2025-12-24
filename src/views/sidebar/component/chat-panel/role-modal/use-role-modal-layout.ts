export const useRoleModalLayout = ({ roleName }: { roleName: string }) => {
  const isEditMode = roleName !== "";
  return {
    isEditMode,
  };
};
