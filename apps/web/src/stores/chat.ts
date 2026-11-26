import { create } from 'zustand';

export type ModelOption = { id: string; label: string; provider?: string };
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
};
export type Conversation = {
  id: number;
  title: string;
  messages: ChatMessage[];
};

type StreamState = {
  [model: string]: {
    buffer: string;
    done: boolean;
  };
};

type ChatState = {
  models: ModelOption[];
  selected: string[];
  conversations: Conversation[];
  activeConversationId: number | null;
  streams: StreamState;
  setModels: (m: ModelOption[]) => void;
  toggleModel: (id: string) => void;
  setActiveConversation: (id: number | null) => void;
  upsertConversation: (conv: Conversation) => void;
  appendAssistantChunk: (model: string, chunk: string) => void;
  endAssistantStream: (model: string) => void;
  resetStreams: () => void;
  clear: () => void;
};

export const useChat = create<ChatState>((set, get) => ({
  models: [],
  selected: [],
  conversations: [],
  activeConversationId: null,
  streams: {},
  setModels: (m) => set({ models: m }),
  toggleModel: (id) =>
    set((s) => {
      const exists = s.selected.includes(id);
      let next = exists ? s.selected.filter((x) => x !== id) : [...s.selected, id];
      if (next.length > 3) next = next.slice(1); // keep up to 3
      return { selected: next };
    }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  upsertConversation: (conv) =>
    set((s) => {
      const idx = s.conversations.findIndex((c) => c.id === conv.id);
      if (idx >= 0) {
        const next = [...s.conversations];
        next[idx] = conv;
        return { conversations: next };
      }
      return { conversations: [conv, ...s.conversations] };
    }),
  appendAssistantChunk: (model, chunk) =>
    set((s) => ({
      streams: {
        ...s.streams,
        [model]: {
          buffer: (s.streams[model]?.buffer ?? '') + chunk,
          done: false,
        },
      },
    })),
  endAssistantStream: (model) =>
    set((s) => ({
      streams: {
        ...s.streams,
        [model]: { buffer: s.streams[model]?.buffer ?? '', done: true },
      },
    })),
  resetStreams: () => set({ streams: {} }),
  clear: () => set({ conversations: [], activeConversationId: null, streams: {} }),
}));

