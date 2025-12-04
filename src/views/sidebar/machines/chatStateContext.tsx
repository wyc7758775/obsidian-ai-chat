import React, { createContext, useContext } from "react";

type ChatStateTuple = [any, (event: any) => void];
const ChatStateContext = createContext<ChatStateTuple | null>(null);
export const ChatStateProvider: React.FC<{
  children: React.ReactNode;
  value: ChatStateTuple;
}> = ({ children, value }) => {
  return (
    <ChatStateContext.Provider value={value}>
      {children}
    </ChatStateContext.Provider>
  );
};

export const useChatState = (): ChatStateTuple => {
  const tuple = useContext(ChatStateContext);
  if (!tuple)
    throw new Error("useChatState must be used within ChatStateProvider");
  return tuple;
};
