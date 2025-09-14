import React, { useState, useRef, useEffect } from 'react';
import { Notice } from 'obsidian';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatComponentProps {
  onSendMessage?: (message: string) => void;
}

export const ChatComponent: React.FC<ChatComponentProps> = ({ onSendMessage }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    
    // 调用外部回调
    onSendMessage?.(inputValue);

    // 模拟回复
    setTimeout(() => {
      const replyMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `这是对 "${inputValue}" 的回复`,
        type: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, replyMessage]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToolAction = (action: string) => {
    switch (action) {
      case 'new-note':
        new Notice('创建新笔记功能');
        break;
      case 'search':
        new Notice('搜索功能');
        break;
      case 'stats':
        new Notice('统计功能');
        break;
      case 'settings':
        new Notice('打开设置');
        break;
    }
  };

  return (
    <div className="yoran-sidebar-content">
      {/* 聊天区域 */}
      <div className="yoran-chat-section">
        <div className="yoran-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`yoran-message yoran-message-${message.type}`}
            >
              <div className="yoran-message-content">{message.content}</div>
              <div className="yoran-message-time">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="yoran-input-container">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入你的消息..."
            className="yoran-chat-input"
            rows={3}
          />
          <button
            onClick={handleSend}
            className="yoran-send-button"
            disabled={!inputValue.trim()}
          >
            发送sdf
          </button>
        </div>
      </div>
      {/* 工具区域 */}
      <div className="yoran-tools-section">
        <div className="yoran-tools-grid">
          {[
            { icon: '📝', text: '新建笔记', action: 'new-note' },
            { icon: '🔍', text: '搜索', action: 'search' },
            { icon: '📊', text: '统计', action: 'stats' },
            { icon: '⚙️', text: '设置', action: 'settings' }
          ].map((tool) => (
            <button
              key={tool.action}
              className="yoran-tool-button"
              onClick={() => handleToolAction(tool.action)}
            >
              <span className="yoran-tool-icon">{tool.icon}</span>
              <span className="yoran-tool-text">{tool.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
