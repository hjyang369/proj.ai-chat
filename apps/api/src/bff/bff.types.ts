export type ChatInitRequest = {
  message: string;
  models: string[]; // up to 3
  conversationId?: number | null;
};

export type ChatInitResponse = {
  success: boolean;
  conversationId: number;
  messageId: number;
  parentUid: string; // job uid
  intentResult: {
    _complexity: 'simple' | 'medium' | 'complex';
    _recommendST: boolean;
    confidence: number;
    reason: string;
  };
  hasRagContext: boolean;
  ragDocumentCount: number;
};

export type ChatStreamBody = {
  message: string;
  model: string;
  conversationId: number;
  messageId: number;
  parentUid: string;
  intentResult: ChatInitResponse['intentResult'];
  hasRagContext: boolean;
  ragDocumentCount: number;
  disableModelSearch?: boolean;
};

export type ChatStreamEvent =
  | { content: string; model: string }
  | { done: true; model: string };

export type ModelInfo = { id: string; label: string; provider?: string };

