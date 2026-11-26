"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { useChat } from "@/stores/chat";
import { useRouter } from "next/navigation";
import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";

type InitResp = {
  success: boolean;
  conversationId: number;
  messageId: number;
  parentUid: string;
  intentResult: {
    _complexity: "simple" | "medium" | "complex";
    _recommendST: boolean;
    confidence: number;
    reason: string;
  };
  hasRagContext: boolean;
  ragDocumentCount: number;
};

async function streamPost(url: string, body: any, onData: (obj: any) => void) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) return;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() || "";
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const payload = line.slice(6);
      if (payload.trim() === "[DONE]") {
        return;
      }
      try {
        const obj = JSON.parse(payload);
        onData(obj);
      } catch {
        // ignore
      }
    }
  }
}

export default function ChatPage() {
  const router = useRouter();
  const { accessToken, loadFromStorage } = useAuth();
  const {
    models,
    selected,
    setModels,
    toggleModel,
    activeConversationId,
    setActiveConversation,
    upsertConversation,
    streams,
    appendAssistantChunk,
    endAssistantStream,
    resetStreams,
  } = useChat();
  const [userInput, setUserInput] = useState("");
  const [sending, setSending] = useState(false);
  const [initSession, setInitSession] = useState<InitResp | null>(null);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    api.get("/models").then((r) => setModels(r.data.models));
  }, [setModels]);

  useEffect(() => {
    if (!accessToken) {
      // token 없어도 MOCK 모드에선 동작하므로, 강제 리다이렉트는 하지 않음
    }
  }, [accessToken]);

  const activeConversation = useMemo(
    () => useChat.getState().conversations.find((c) => c.id === activeConversationId) || null,
    [activeConversationId]
  );

  async function onSend() {
    if (!userInput.trim() || selected.length === 0) return;
    setSending(true);
    resetStreams();
    // Start session
    const init = await api
      .post<InitResp>("/chat/init", {
        message: userInput,
        models: selected,
        conversationId: activeConversationId,
      })
      .then((r) => r.data);
    setInitSession(init);
    const conv = activeConversation || {
      id: init.conversationId,
      title: userInput.slice(0, 20) || "New Chat",
      messages: [],
    };
    conv.messages = [...conv.messages, { role: "user", content: userInput }];
    setActiveConversation(init.conversationId);
    upsertConversation(conv);
    // Stream per model
    await Promise.all(selected.map(async (model) => {
      const body = {
        message: userInput,
        model,
        conversationId: init.conversationId,
        messageId: init.messageId,
        parentUid: init.parentUid,
        intentResult: init.intentResult,
        hasRagContext: init.hasRagContext,
        ragDocumentCount: init.ragDocumentCount,
        disableModelSearch: true,
      };
      await streamPost(`${api.defaults.baseURL}/chat/stream`, body, (obj) => {
        if (obj?.content) {
          appendAssistantChunk(model, obj.content);
        }
      });
      endAssistantStream(model);
    }));
    setSending(false);
    const nextConv = useChat.getState().conversations.find((c) => c.id === init.conversationId);
    if (nextConv) {
      const next = { ...nextConv };
      selected.forEach((m) => {
        const text = useChat.getState().streams[m]?.buffer || "";
        next.messages.push({ role: "assistant", content: text, model: m });
      });
      upsertConversation(next);
      setUserInput("");
    }
  }

  return (
    <div className="h-screen grid grid-cols-[280px_1fr]">
      <aside className="border-r border-zinc-200 dark:border-zinc-800 p-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">대화</h2>
          <button
            className="text-xs text-blue-600 hover:underline"
            onClick={() => setActiveConversation(null)}
          >
            새로 만들기
          </button>
        </div>
        <div className="space-y-1">
          {useChat.getState().conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveConversation(c.id)}
              className={`w-full text-left px-2 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                activeConversationId === c.id ? "bg-zinc-100 dark:bg-zinc-900" : ""
              }`}
            >
              <div className="text-sm text-zinc-900 dark:text-zinc-100 truncate">{c.title}</div>
              <div className="text-[11px] text-zinc-500">{c.messages.length} 메세지</div>
            </button>
          ))}
        </div>
      </aside>
      <main className="flex flex-col h-full">
        <header className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center gap-3">
          <div className="text-sm text-zinc-700 dark:text-zinc-200">모델 선택 (최대 3개)</div>
          <div className="flex gap-2">
            {models.map((m) => {
              const active = selected.includes(m.id);
              return (
                <button
                  key={m.id}
                  className={`px-2 py-1 rounded text-xs border ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700"
                  }`}
                  onClick={() => toggleModel(m.id)}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeConversation?.messages.map((m, i) => (
            <div key={i} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
              {m.role === "assistant" && m.model && (
                <div className="text-xs text-zinc-500 mb-2">{m.model}</div>
              )}
              <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-zinc dark:prose-invert">
                {m.content}
              </ReactMarkdown>
            </div>
          ))}
          {/* Streaming previews */}
          {Object.entries(streams).map(([model, s]) => (
            <div key={model} className="rounded-lg border border-blue-200 dark:border-blue-900 p-4">
              <div className="text-xs text-blue-600 mb-2">{model} (streaming)</div>
              <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-zinc dark:prose-invert">
                {s.buffer}
              </ReactMarkdown>
            </div>
          ))}
        </div>
        <footer className="border-t border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="메시지를 입력하세요…"
              className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <button
              onClick={onSend}
              disabled={sending || selected.length === 0 || !userInput.trim()}
              className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50"
            >
              전송
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}

