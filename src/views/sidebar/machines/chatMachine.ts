import { createMachine } from "xstate";

// 定义状态机
export const chatMachine = createMachine({
  id: "chat",
  initial: "idle",
  states: {
    idle: {
      on: {
        SEND_MESSAGE: "loading",
      },
    },
    loading: {
      on: {
        SUCCESS: "success",
        ERROR: "error",
        STREAM_START: "streaming", // 流式响应开始
      },
    },
    streaming: {
      on: {
        STREAM_UPDATE: "streaming", // 流式数据更新
        STREAM_END: "success",
      },
    },
    success: {
      on: {
        SEND_MESSAGE: "loading",
      },
    },
    error: {
      on: {
        RETRY: "loading",
      },
    },
  },
});
