export type GeminiConfig = {
  model: string;
  systemInstruction: string;
  tools: any[];
};

export type ToolCall = {
  functionCalls: {
    name: string;
    id: string;
    args: any;
  }[];
};

export type ServerContent = {
  modelTurn?: {
    parts: {
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }[];
  };
  serverContent?: {
    modelTurn?: {
      parts: {
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }[];
    };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
  toolCall?: ToolCall;
};

export type ClientContent = {
  realtimeInput?: {
    mediaChunks: {
      mimeType: string;
      data: string;
    }[];
  };
  toolResponse?: {
    functionResponses: {
      response: any;
      id: string;
    }[];
  };
};

