import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { getOpenai } from "../modules/ai-chat/openai";
import { yoranChatSettings } from "src/main";

interface Message {
	id: string;
	content: string;
	type: "user" | "assistant";
	username?: string;
}

interface ChatComponentProps {
	onSendMessage?: (message: string) => void;
	settings: yoranChatSettings;
}

export const ChatComponent: React.FC<ChatComponentProps> = ({
	onSendMessage,
	settings,
}) => {
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputValue, setInputValue] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const handleSend = async () => {
		if (!inputValue.trim()) return;

		const newMessage: Message = {
			id: Date.now().toString(),
			content: inputValue,
			type: "user",
		};

		setMessages((prev) => [...prev, newMessage]);
		setInputValue("");

		onSendMessage?.(inputValue);

		const aiMessageId = (Date.now() + 1).toString();
		const aiMessage: Message = {
			id: (Date.now() + 1).toString(),
			content: "",
			type: "assistant",
		};
		setMessages((prev) => [...prev, aiMessage]);

		// Call the OpenAI API
		getOpenai({
			settings,
			inputValue,
			onChunk: (chunk: string) => {
				setMessages((prev) =>
					prev.map((msg) =>
						msg.id === aiMessageId
							? { ...msg, content: msg.content + chunk }
							: msg
					)
				);
			},
		});
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div className="yoran-chat-container">
			{/* 消息区域 */}
			<div className="yoran-messages-container">
				{messages.map((message) => (
					<div
						key={message.id}
						className={`yoran-message-wrapper yoran-message-${message.type}`}
					>
						{message.type === "user" ? (
							<div className="yoran-user-message">
								<div className="yoran-user-bubble">
									<div className="yoran-user-content">
										{message.content}
									</div>
								</div>
							</div>
						) : (
							<div className="yoran-assistant-message">
								<div className="yoran-assistant-text">
									<ReactMarkdown
										remarkPlugins={[remarkGfm]}
										rehypePlugins={[rehypeHighlight]}
									>
										{message.content}
									</ReactMarkdown>
								</div>
								<div
									className="yoran-copy-btn"
									onClick={() => {
										navigator.clipboard.writeText(
											message.content
										);
									}}
								>
									<svg
										className="force-icon force-icon-copy "
										width="1em"
										height="1em"
										viewBox="0 0 48 48"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											fill-rule="evenodd"
											clip-rule="evenodd"
											d="M32 12a2 2 0 012 2v28.222c0 .982-.836 1.778-1.867 1.778H7.867C6.836 44 6 43.204 6 42.222V13.778C6 12.796 6.836 12 7.867 12H32zm-2 4H10v24h20V16zM40 4a2 2 0 012 2v25a1 1 0 01-1 1h-2a1 1 0 01-1-1V8H19a1 1 0 01-1-1V5a1 1 0 011-1h21z"
											fill="currentColor"
										></path>
									</svg>
								</div>
							</div>
						)}
					</div>
				))}
				{messages.length === 0 && <div className="yoran-logo">😊</div>}
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
