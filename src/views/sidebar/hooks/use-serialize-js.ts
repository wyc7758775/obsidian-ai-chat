import { useMemo } from "react";
import serialize from "serialize-javascript";

type Options = { maxDepth?: number };

// 仅使用第三方库 serialize-javascript 进行字符串序列化
export const useSerializeJS = () => {
  return useMemo(() => {
    return (input: unknown, _options?: Options): string => {
      // 直接使用 serialize-javascript，将对象序列化为安全字符串
      return serialize(input, { unsafe: false, ignoreFunction: true });
    };
  }, []);
};

// 解析 serialize-javascript 的结果：
// 优先 JSON.parse（我们的快照是纯 JSON），必要时再尝试构造函数解析。
export const parseSerializeJS = (str: string): any => {
  try {
    return JSON.parse(str);
  } catch {
    try {
      // 注意：仅作为兜底解析，避免在非 JSON 输出时失败；不建议存储可执行内容
      // eslint-disable-next-line no-new-func
      return new Function("return " + str)();
    } catch {
      return null;
    }
  }
};
