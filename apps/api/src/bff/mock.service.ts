import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import type {
  ChatInitRequest,
  ChatInitResponse,
  ChatStreamBody,
} from './bff.types.js';

type MemoryConversation = {
  cs_no: number;
  title: string;
  messages: { ms_no: number; role: 'user' | 'assistant'; content: string }[];
};

@Injectable()
export class MockService {
  private conversations = new Map<number, MemoryConversation>();
  private nextConversationId = 1000;
  private nextMessageId = 5000;

  listConversations() {
    return Array.from(this.conversations.values()).map((c) => ({
      cs_no: c.cs_no,
      title: c.title,
      messageCount: c.messages.length,
    }));
  }

  private createConversation(title: string): number {
    const cs_no = this.nextConversationId++;
    this.conversations.set(cs_no, {
      cs_no,
      title,
      messages: [],
    });
    return cs_no;
  }

  private pushMessage(
    cs_no: number,
    role: 'user' | 'assistant',
    content: string,
  ): number {
    const conv = this.conversations.get(cs_no);
    if (!conv) throw new Error('Conversation not found');
    const ms_no = this.nextMessageId++;
    conv.messages.push({ ms_no, role, content });
    return ms_no;
  }

  chatInit(req: ChatInitRequest): ChatInitResponse {
    const cs_no =
      req.conversationId ?? this.createConversation(req.message.slice(0, 20));
    const ms_no = this.pushMessage(cs_no, 'user', req.message);
    const parentUid = randomUUID();
    // trivial mock complexity
    const intentResult: ChatInitResponse['intentResult'] = {
      _complexity: req.message.length > 100 ? 'complex' : 'simple',
      _recommendST: /생각|고려|단계/i.test(req.message),
      confidence: 0.9,
      reason: 'mocked',
    };
    return {
      success: true,
      conversationId: cs_no,
      messageId: ms_no,
      parentUid,
      intentResult,
      hasRagContext: false,
      ragDocumentCount: 0,
    };
  }

  chatStream(body: ChatStreamBody): Readable {
    const { message, model } = body;
    const full = this.generateMockAnswer(model, message);
    const chunks = this.chunkString(full, 24);
    let i = 0;
    const stream = new Readable({
      read() {
        // no-op: we'll push on interval
      },
    });
    const interval = setInterval(() => {
      if (i < chunks.length) {
        const data = JSON.stringify({ content: chunks[i++], model });
        stream.push(`data: ${data}\n\n`);
      } else {
        clearInterval(interval);
        stream.push(`data: [DONE]\n\n`);
        stream.push(null);
      }
    }, 80);
    return stream;
  }

  private generateMockAnswer(model: string, prompt: string) {
    const prefix =
      model === 'gpt-4o'
        ? 'GPT-4o'
        : model.includes('claude')
          ? 'Claude 3.5'
          : model.includes('llama')
            ? 'Llama 3.1'
            : model;
    return `${prefix} 응답입니다. 요청하신 내용에 대해 간단히 정리해 드릴게요:\n\n- 질문 요약: ${prompt.slice(0, 180)}\n- 핵심 포인트 1: 예시 데이터와 규칙을 바탕으로 단계적으로 설명합니다.\n- 핵심 포인트 2: 필요한 경우 RAG 없이도 직접 답변합니다.\n\n마지막으로, 추가 질문이 있으면 말씀해 주세요.`;
  }

  private chunkString(s: string, size: number) {
    const out: string[] = [];
    let i = 0;
    while (i < s.length) {
      out.push(s.slice(i, i + size));
      i += size;
    }
    return out;
  }
}

