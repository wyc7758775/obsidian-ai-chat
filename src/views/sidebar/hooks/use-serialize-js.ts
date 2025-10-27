import { useMemo } from "react";

type Options = { maxDepth?: number };

// 仅序列化安全字段，避免循环引用（如 Obsidian 的 TFile 内部结构）
export const useSerializeJS = () => {
  return useMemo(() => {
    return (input: unknown, _options?: Options): string => {
      const obj = input as any;
      const file = obj?.file ?? obj;
      const title = obj?.title ?? file?.basename ?? file?.name ?? undefined;
      const path = obj?.path ?? file?.path ?? undefined;
      const icon = obj?.icon ?? "📄";
      // 始终返回纯 JSON 字符串，便于存储与解析
      return JSON.stringify({ title, path, icon });
    };
  }, []);
};

// 解析存储的快照：支持
// 1) 字符串（JSON）
// 2) 数组
// 3) 形如 { serialized: string; filePath?: string } 的条目
export const parseSerializeJS = (value: any): any[] => {
  const normalize = (entry: any) => {
    if (!entry) return null;
    if (typeof entry === "string") {
      try {
        return JSON.parse(entry);
      } catch {
        return null;
      }
    }
    if (entry && typeof entry === "object" && "serialized" in entry) {
      try {
        const parsed = JSON.parse((entry as any).serialized);
        if ((entry as any).filePath && !parsed.path) parsed.path = (entry as any).filePath;
        return parsed;
      } catch {
        return (entry as any).filePath ? { path: (entry as any).filePath } : null;
      }
    }
    // 已是轻量对象的情况，直接返回
    return entry;
  };

  if (Array.isArray(value)) {
    return value.map(normalize).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // 非 JSON 字符串，放弃解析
      return [];
    }
  }
  return [];
};
