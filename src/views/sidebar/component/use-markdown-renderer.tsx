import React from "react";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import styles from "../css/message-list.module.css";
import { CopyIcon } from "./icon";

// 工具：提取 React children 的纯文本
const toText = (c: any): string => {
  if (Array.isArray(c)) return c.map(toText).join("");
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && "props" in c) {
    return toText((c as any).props?.children);
  }
  return "";
};

// Hook 工厂：返回一个根据内容构建 Markdown 渲染 props 的函数
export function useMarkdownRenderer() {
  const buildProps = React.useCallback((content: string) => {
    const remarkPlugins = [remarkGfm];
    const rehypePlugins = [[rehypeHighlight, { ignoreMissing: true }]] as const;

    const components = {
      // 在 <pre> 层包裹复制按钮，避免 <p> 内嵌套 <pre> 的错误
      pre(props: any) {
        const childrenArray = React.Children.toArray(props.children);
        let lang = "";
        let codeText = "";
        if (childrenArray.length === 1) {
          const codeEl: any = childrenArray[0];
          const className: string = codeEl?.props?.className || "";
          const m = /language-([\w-]+)/.exec(className);
          lang = m?.[1] ?? "";
          codeText = toText(codeEl?.props?.children);
        } else {
          codeText = toText(props.children);
        }
        const md = `\`\`\`${lang}\n${codeText}\n\`\`\``;
        return (
          <div className={styles.blockWithCopy}>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={() => navigator.clipboard.writeText(md)}
              aria-label="复制代码"
            >
              <CopyIcon />
            </button>
            <pre {...props}>{props.children}</pre>
          </div>
        );
      },
      // 行内代码保持默认渲染
      code(props: any) {
        const { className, children, ...rest } = props;
        return (
          <code className={className} {...rest}>
            {children}
          </code>
        );
      },
      // 表格复制：优先用 AST 位置在原始内容中切片 Markdown
      table({ node, children, ...props }: any) {
        let md = "";
        const pos: any = node?.position;
        const start = pos?.start?.offset;
        const end = pos?.end?.offset;
        if (typeof start === "number" && typeof end === "number") {
          md = content.slice(start, end);
        } else {
          md = toText(children).trim();
        }
        return (
          <div className={styles.blockWithCopy}>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={() => navigator.clipboard.writeText(md)}
              aria-label="复制表格Markdown"
            >
              <CopyIcon />
            </button>
            <table {...props}>{children}</table>
          </div>
        );
      },
    } as const;

    return { remarkPlugins, rehypePlugins, components };
  }, []);

  return buildProps;
}