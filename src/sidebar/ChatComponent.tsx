import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
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
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    
    onSendMessage?.(inputValue);

    // 模拟 AI 回复
    setTimeout(() => {
      const replyMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `这是对 "${inputValue}" 的智能回复。我可以帮助你处理各种任务，包括文档分析、内容生成等。`,
        type: 'assistant'
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

  return (
    <div className="yoran-chat-container">
      {/* 消息区域 */}
      <div className="yoran-messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`yoran-message-wrapper yoran-message-${message.type}`}>
            {message.type === 'user' ? (
              <div className="yoran-user-message">
                <div className="yoran-user-bubble">
                  <div className="yoran-user-content">{message.content}</div>
                </div>
              </div>
            ) : (
              <div className="yoran-assistant-message">
				<div className="yoran-assistant-text">{message.content}</div>
              </div>
            )}
          </div>
        ))}
		{
			messages.length === 0 && (
				<div className="yoran-logo">
					😊
				</div>
			)
		}
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
