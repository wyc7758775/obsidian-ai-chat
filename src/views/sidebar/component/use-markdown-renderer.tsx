import React from "react";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import styles from "../css/message-list.module.css";
import { CopyIcon } from "./icon";

// 工具：提取 React children 的纯文本
function toText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (React.isValidElement(node)) return toText(node.props?.children);
  return "";
}

type HasPosition = {
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};

type PreProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLPreElement>, HTMLPreElement> & {
  children?: React.ReactNode;
};

type CodeProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
  children?: React.ReactNode;
};

type TableProps = React.DetailedHTMLProps<React.TableHTMLAttributes<HTMLTableElement>, HTMLTableElement> & {
  children?: React.ReactNode;
};

// Hook 工厂：返回一个根据内容构建 Markdown 渲染 props 的函数
export function useMarkdownRenderer() {
  const buildProps = React.useCallback((content: string) => {
    const remarkPlugins: unknown[] = [remarkGfm];
    const rehypePlugins: unknown[] = [[rehypeHighlight, { ignoreMissing: true }]];

    const components = {
      // 在 <pre> 层包裹复制按钮，避免 <p> 内嵌套 <pre> 的错误
      pre(props: PreProps) {
        const childrenArray = React.Children.toArray(props.children);
        let lang = "";
        let codeText = "";
        if (childrenArray.length === 1) {
          const codeEl = childrenArray[0];
          if (React.isValidElement<CodeProps>(codeEl)) {
            const className: string = codeEl.props?.className || "";
            const m = /language-([\w-]+)/.exec(className);
            lang = m?.[1] ?? "";
            codeText = toText(codeEl.props?.children);
          } else {
            codeText = toText(codeEl);
          }
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
      code(props: CodeProps) {
        const { className, children, ...rest } = props;
        return (
          <code className={className} {...rest}>
            {children}
          </code>
        );
      },
      // 表格复制：优先用 AST 位置在原始内容中切片 Markdown
      table(props: TableProps & { node?: HasPosition }) {
        const { node, children, ...rest } = props;
        let md = "";
        const start = node?.position?.start?.offset;
        const end = node?.position?.end?.offset;
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
            <table {...rest}>{children}</table>
          </div>
        );
      },
    } 
    return { remarkPlugins, rehypePlugins, components };
  }, []);

  return buildProps;
}