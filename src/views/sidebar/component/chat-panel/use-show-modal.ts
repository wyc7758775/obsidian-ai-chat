import { useEffect, useState, useRef } from "react";
import { ActiveKey } from "./with-actions";

export const useShowModal = () => {
  const [showHistoryAndRoles, setShowHistoryAndRoles] = useState<ActiveKey>(
    ActiveKey.NONE,
  );

  const modalRef = useRef<HTMLDivElement>(null);

  const handleExpand = (e: React.MouseEvent<HTMLElement>) => {
    const nextKey = (e.currentTarget as HTMLElement)?.dataset?.key;
    setShowHistoryAndRoles((prev) => (prev === nextKey ? null : nextKey));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        const el = event.target as Element | null;
        const keyAttr = el?.getAttribute?.("data-key");
        if (keyAttr && keyAttr === showHistoryAndRoles) return;
        setShowHistoryAndRoles(null);
      }
    };

    if (showHistoryAndRoles) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showHistoryAndRoles]);
  return {
    modalRef,
    handleExpand,
    setShowHistoryAndRoles,
    showHistoryAndRoles,
  };
};
