import { App } from "obsidian";
import { AddIcon, ExpandIcon, FoldIcon, HistoryIcon } from "./icon";
import { useState } from "react";
import { HistoryItem } from "../type";

export type ChatMessageProps = {
  app: App;
};
export const useHistory = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItem>(
    {} as HistoryItem
  );
  const [currentId, setCurrentId] = useState<string>("");

  const historyRender: React.FC<ChatMessageProps> = ({ app }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleExpand = () => {
      setIsExpanded(true);
    };

    const handleFold = () => {
      setIsExpanded(false);
    };
    const handleAdd = () => {
      console.log("新增对话");
    };

    // 历史对话列表数据
    const historyList: any = [
      {
        id: "1",
        messages: [
          {
            id: "1",
            content: "项目规划与需求分析 赛肯讲讲经篮筐",
            type: "user",
          },
        ],
      },
      {
        id: "2",
        messages: [{ id: "2", content: "前端组件设计讨论", type: "user" }],
      },
      {
        id: "3",
        messages: [{ id: "3", content: "数据库表结构优化", type: "user" }],
      },
      {
        id: "4",
        messages: [{ id: "4", content: "用户权限与认证方案", type: "user" }],
      },
      {
        id: "5",
        messages: [{ id: "5", content: "性能瓶颈排查记录", type: "user" }],
      },
      {
        id: "6",
        messages: [
          {
            id: "6",
            content: "项目规划与需求分析 赛肯讲讲经篮筐",
            type: "user",
          },
        ],
      },
      {
        id: "7",
        messages: [{ id: "7", content: "前端组件设计讨论", type: "user" }],
      },
      {
        id: "8",
        messages: [{ id: "8", content: "数据库表结构优化", type: "user" }],
      },
      {
        id: "9",
        messages: [{ id: "9", content: "用户权限与认证方案", type: "user" }],
      },
      {
        id: "10",
        messages: [{ id: "10", content: "性能瓶颈排查记录", type: "user" }],
      },
    ];

    const handleUpdateHistoryItem = (item: HistoryItem) => {
      setCurrentId(item.id);
      setHistoryItems(item);
    };

    const historyItemRender = (item: HistoryItem, index: number) => (
      <div
        className="yoran-history__fold-item"
        key={index}
        onClick={() => handleUpdateHistoryItem(item)}
      >
        <div className="yoran-history__fold-icon">
          <HistoryIcon />
        </div>
        <div className="yoran-history__fold-text">
          {item.messages[0].content}
        </div>
      </div>
    );

    return (
      <div className="yoran-history">
        {/*  收起容器 */}
        {!isExpanded && (
          <div className="yoran-history__fold">
            <div className="yoran-history__fold-add">
              <AddIcon onClick={handleAdd} />
            </div>
            <div className="yoran-history__fold-list">
              {historyList.map((item: HistoryItem, index: number) => historyItemRender(item, index))}
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
              {historyList.map((item: HistoryItem, index: number) => historyItemRender(item, index))}
            </div>
            <div className="yoran-history__fold-action">
              <FoldIcon onClick={handleFold} />
            </div>
          </div>
        )}
      </div>
    );
  };
  return {
    historyRender,
    historyItems,
    currentId,
  };
};
