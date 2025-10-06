import { App } from "obsidian";
import { AddIcon, ExpandIcon, FoldIcon, HistoryIcon } from "./icon";
import { useState } from "react";

export type ChatMessageProps = {
  app: App;
};
export const useHistory = () => {
  const historyRender:  React.FC<ChatMessageProps> = ({ app }) => {

    const [isExpanded, setIsExpanded] = useState(true);

    const handleExpand = () => {
      setIsExpanded(true);
    }

    const handleFold = () => {
      setIsExpanded(false);
    }
    const handleAdd = () => {
      console.log('新增对话')
    }

    // 历史对话列表数据
    const historyList = [
      { sub: '项目规划与需求分析 赛肯讲讲经篮筐' },
      { sub: '前端组件设计讨论' },
      { sub: '数据库表结构优化' },
      { sub: '用户权限与认证方案' },
      { sub: '性能瓶颈排查记录' },
      { sub: '项目规划与需求分析 赛肯讲讲经篮筐' },
      { sub: '前端组件设计讨论' },
      { sub: '数据库表结构优化' },
      { sub: '用户权限与认证方案' },
      { sub: '性能瓶颈排查记录' }
    ];

    const historyItemRender = ({ sub }: { sub: string }, index: number) => (
      <div className="yoran-history__fold-item" key={index}>
        <div className="yoran-history__fold-icon">
          <HistoryIcon />
        </div>
        <div className="yoran-history__fold-text">
          {sub}
        </div>
      </div>
    )

    return (
      <div className="yoran-history">
        {/*  收起容器 */}
        {!isExpanded && (
          <div className="yoran-history__fold">
            <div className="yoran-history__fold-add">
              <AddIcon onClick={handleAdd} />
            </div>
            <div className="yoran-history__fold-list">
              {historyList.map((item, index) => (
                historyItemRender(item, index)
              ))}
            </div>
            <div className="yoran-history__fold-expand">
              <ExpandIcon onClick={handleExpand} />
            </div>
          </div>
        )}
        {/* 展开容器 */}
        {isExpanded && (
          <div className="yoran-history__expand">
            <div className="yoran-history__expand-list">
              {historyList.map((item, index) => (
                historyItemRender(item, index)
              ))}
            </div>
            <div className="yoran-history__fold-action">
              <FoldIcon onClick={handleFold} />
            </div>
          </div>
        )}
      </div>
    )
  }
  return {
    historyRender
  };  
}