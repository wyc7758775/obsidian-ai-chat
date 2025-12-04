import { createMachine } from "xstate";

export const chatMachine = createMachine({
  id: "chat",
  initial: "idle",
  states: {
    idle: {
      on: {
        ENABLE_CLICK: "clickable",
      },
    },
    clickable: {
      on: {
        DISABLE_CLICK: "idle",
        STREAM_START: "streaming", // 流式响应开始
      },
    },
    streaming: {
      on: {
        INIT: "idle",
        STREAM_END: "success",
        ERROR: "error",
      },
    },
    success: {
      on: {
        INIT: "idle",
      },
    },
    error: {
      on: {
        INIT: "idle",
      },
    },
  },
});
