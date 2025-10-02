import { App } from "obsidian";

export type ChatMessageProps = {
  app: App;
};
export const useHistory = () => {
  const historyRender:  React.FC<ChatMessageProps> = ({ app }) => {

    return (
      <div className="yoran-history">
        {/*  收起容器 */}
        <div className="yoran-history__fold">
          {/* 新增对话 */}
          {/* 历史对话 目录 */}
        </div>
        {/* 展开容器 */}
        <div className="yoran-history__expand">
          {/* 新增对话 */}
          {/* 历史对话 目录 */}
        </div>
      </div>
    )
  }
  return {
    historyRender
  }
};