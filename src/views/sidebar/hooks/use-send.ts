import { useState } from "react";

export const useSend = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  return {
    isStreaming,
    setIsStreaming,
  };
};
