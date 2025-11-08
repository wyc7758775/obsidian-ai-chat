import { ChatInput } from "./chat-input";
export const Chat = () => {
  return (
    <>
      {selectedNotes.length > 0 && (
        <SelectedFiles nodes={selectedNotes} onDeleteNote={onDeleteNote} />
      )}
      {
        <ChatInput
          textareaRef={textareaRef}
          handleInputChange={handleInputChange}
          handleKeyPress={handleKeyPress}
          handleSend={handleSend}
          blurCallBack={blurCallBack}
          handleCancelStream={handleCancelStream}
          inputValue={inputValue}
          isStreaming={isStreaming}
        />
      }
    </>
  );
};
