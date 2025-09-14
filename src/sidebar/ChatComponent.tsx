import React, { useState, useRef, useEffect } from 'react';
import { Notice } from 'obsidian';
import './styles.css';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  username?: string;
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
      timestamp: new Date(),
      username: '赛凡'
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    
    onSendMessage?.(inputValue);

    // 模拟 AI 回复
    setTimeout(() => {
      const replyMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `这是对 "${inputValue}" 的智能回复。我可以帮助你处理各种任务，包括文档分析、内容生成等。`,
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

  const handleClearChat = () => {
    setMessages([]);
    new Notice('聊天记录已清空');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    }).toUpperCase();
  };

  return (
    <div className="yoran-chat-container">
      {/* 头部 */}
      <div className="yoran-chat-header">
        <div className="yoran-chat-title">
          <span className="yoran-chat-icon">🤖</span>
          <span>AI 助手</span>
        </div>
        <div className="yoran-chat-actions">
          <button className="yoran-action-btn" onClick={handleClearChat}>
            🗑️
          </button>
          <button className="yoran-action-btn" onClick={() => new Notice('设置功能')}>
            ⚙️
          </button>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="yoran-messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`yoran-message-wrapper yoran-message-${message.type}`}>
            {message.type === 'user' ? (
              <div className="yoran-user-message">
                <div className="yoran-user-bubble">
                  <div className="yoran-user-content">{message.content}</div>
                  <div className="yoran-user-info">
                    <span className="yoran-user-avatar">👤</span>
                    <span className="yoran-username">{message.username}</span>
                    <span className="yoran-timestamp">{formatTime(message.timestamp)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="yoran-assistant-message">
                <div className="yoran-assistant-avatar">🤖</div>
                <div className="yoran-assistant-content">
                  <div className="yoran-assistant-text">{message.content}</div>
                  <div className="yoran-assistant-time">{formatTime(message.timestamp)}</div>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="yoran-input-area">
        <div className="yoran-input-wrapper">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            className="yoran-input-field"
          />
          <button
            onClick={handleSend}
            className="yoran-send-btn"
            disabled={!inputValue.trim()}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};
