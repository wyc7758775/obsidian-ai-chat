import { App } from "obsidian";
import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { getOpenai } from "../modules/ai-chat/openai";
import { yoranChatSettings } from "src/main";
import { NoteContextService } from "../modules/fs-context/note-context";

interface Message {
	id: string;
	content: string;
	type: "user" | "assistant";
	username?: string;
}

interface ChatComponentProps {
	onSendMessage?: (message: string) => void;
	settings: yoranChatSettings;
	app: App;
}

export const ChatComponent: React.FC<ChatComponentProps> = ({
	onSendMessage,
	settings,
	app,
}) => {
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isStreaming, setIsStreaming] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const cancelToken = useRef({ cancelled: false });

	const noteContextService = new NoteContextService(app);
	noteContextService.getAllNotes();

	const [selectedNotes, setSelectedNotes] = useState<any[]>([]);

	useEffect(() => {
		if (noteContextService.getCurrentNote()) {
			const context = noteContextService.getCurrentNote();
			setSelectedNotes([context, context, context, context, context]);
		}
	}, [noteContextService.getCurrentNote()]);

	const [isAtBottom, setIsAtBottom] = useState(true);
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	const observerRef = useRef<IntersectionObserver | null>(null);
	useEffect(() => {
		if (!messagesEndRef.current) return;

		observerRef.current = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				// 当底部元素可见时，设置为在底部
				setIsAtBottom(entry.isIntersecting);
			},
			{
				rootMargin: "0px 0px 0px 0px",
				threshold: 1.0,
			}
		);

		observerRef.current.observe(messagesEndRef.current);

		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
		};
	}, []);
	useEffect(() => {
		if (isAtBottom) {
			scrollToBottom();
		}
	}, [messages, isAtBottom]);

	// 完整的无限高度自适应函数
	const adjustTextareaHeight = useCallback(() => {
		if (!textareaRef.current) return;

		const textarea = textareaRef.current;
		const minHeight = 20;

		// 重置高度
		textarea.style.height = "auto";

		// 获取内容高度
		const contentHeight = textarea.scrollHeight;

		// 设置新高度（不限制最大值）
		const newHeight = Math.max(minHeight, contentHeight);
		textarea.style.height = `${newHeight}px`;

		// 确保没有滚动条
		textarea.style.overflowY = "hidden";

		// 可选：如果高度变化很大，滚动到输入框位置
		if (contentHeight > 100) {
			setTimeout(() => {
				textarea.scrollIntoView({
					behavior: "smooth",
					block: "nearest",
				});
			}, 0);
		}
	}, []);
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

		const noteContext = selectedNotes.length
			? await noteContextService.getNoteContent(selectedNotes[0])
			: undefined;

		// Call the OpenAI API
		getOpenai({
			settings,
			inputValue,
			notePrompts: [
				typeof noteContext === "string"
					? noteContext
					: noteContext?.content ?? "",
			],
			contextMessages: messages.map((msg) => ({
				role: msg.type === "user" ? "user" : "assistant",
				content: msg.content,
			})),
			callBacks: {
				onChunk: (chunk: string) => {
					setMessages((prev) =>
						prev.map((msg) =>
							msg.id === aiMessageId
								? { ...msg, content: msg.content + chunk }
								: msg
						)
					);
				},
				onStart: () => {
					setIsStreaming(true);
				},
				onComplete: () => {
					cancelToken.current.cancelled = false;
					setIsStreaming(false);
				},
			},
			cancelToken: cancelToken.current,
		});
	};

	const handleCancelStream = () => {
		cancelToken.current.cancelled = true;
		setIsStreaming(false);
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
											fillRule="evenodd"
											clipRule="evenodd"
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
				<div ref={messagesEndRef} ></div>
			</div>

			{/* 输入区域 */}
			<div className="yoran-input-area">
				{selectedNotes.length > 0 && (
					<div className="yoran-file-wrapper">
						{selectedNotes.map((note) => (
							<div className="yoran-file-item" key={note.path}>
								<span
									className="yoran-file-close"
									onClick={() => {
										setSelectedNotes(
											selectedNotes.filter(
												(n) => n.path !== note.path
											)
										);
									}}
								>
									x
								</span>
								<span>{note.name}</span>
								<div className="yoran-file-line"></div>
								<span>{note.path}</span>
							</div>
						))}
					</div>
				)}
				<div className="yoran-input-wrapper">
					<textarea
						ref={textareaRef}
						value={inputValue}
						rows={1}
						onChange={(e) => {
							setInputValue(e.target.value);
							setTimeout(() => adjustTextareaHeight(), 0);
						}}
						onKeyPress={handleKeyPress}
						placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
						className="yoran-input-field"
					></textarea>
					{isStreaming ? (
						<button
							onClick={handleCancelStream}
							className="yoran-cancel-btn"
						>
							||
						</button>
					) : (
						<button
							onClick={handleSend}
							className="yoran-send-btn"
							disabled={!inputValue.trim()}
						>
							➤
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
