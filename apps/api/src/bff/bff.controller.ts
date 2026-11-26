import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Res,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import { Readable } from 'stream';
import { UpstreamService } from './upstream.service.js';
import { MockService } from './mock.service.js';
import type {
  ChatInitRequest,
  ChatStreamBody,
  ModelInfo,
} from './bff.types.js';

function isMock(): boolean {
  return String(process.env.MOCK_WEEAI).toLowerCase() === 'true';
}

@Controller('bff')
export class BffController {
  constructor(
    private readonly upstream: UpstreamService,
    private readonly mock: MockService,
  ) {}

  @Get('health')
  health() {
    return { ok: true, mode: isMock() ? 'mock' : 'live' };
  }

  @Get('models')
  models(): { models: ModelInfo[] } {
    // Minimal fixed list for demo; in live mode you could map from /api/config/{cf_no}/ai-settings
    return {
      models: [
        { id: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
        { id: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
        { id: 'llama-3.1-405b', label: 'Llama 3.1 405B', provider: 'Meta' },
      ],
    };
  }

  @Get('conversations')
  conversations() {
    if (isMock()) {
      return { items: this.mock.listConversations() };
    }
    // In live mode fetch from upstream if needed; out of minimal scope
    return { items: [] };
  }

  @Post('chat/init')
  async chatInit(
    @Body() body: ChatInitRequest,
    @Headers('authorization') auth?: string,
  ) {
    if (isMock()) {
      return this.mock.chatInit(body);
    }
    const token =
      process.env.WEEAI_ACCESS_TOKEN ||
      (auth?.startsWith('Bearer ') ? auth.slice(7) : undefined);

    // Optional: validate token
    // await this.upstream.me(token);

    // Minimal orchestration: assume mb_no is resolved upstream; in demo accept mb_no=1
    const mb_no = Number(process.env.WEEAI_MB_NO ?? 1);
    await this.upstream.creditCheck(token, {
      mb_no,
      model_count: Math.min(3, body.models.length),
    });
    const job = await this.upstream.createJob(token, mb_no, body.models.length);
    const cs_no =
      body.conversationId ??
      (await this.upstream.createConversation(
        token,
        mb_no,
        body.message.slice(0, 20),
      )).cs_no;
    const ms_no = (
      await this.upstream.saveMessage(token, {
        cs_no,
        ms_role: 'user',
        ms_content: body.message,
      })
    ).ms_no;
    // Optional pre-intent steps
    const complexity = await this.upstream.analyzeComplexity(token, {
      query: body.message,
      recentMessages: [],
      memoryRecentMessages: [],
      memoryEnabled: false,
      ragSignal: {
        templateRelevant: false,
        workspaceRelevant: false,
        sources: [],
      },
    });
    const intentResult = {
      _complexity: complexity.complexity ?? 'simple',
      _recommendST: !!complexity.recommendSequentialThinking,
      confidence: complexity.score ?? 1,
      reason: complexity.reason ?? 'n/a',
    } as const;
    return {
      success: true,
      conversationId: cs_no,
      messageId: ms_no,
      parentUid: job.jb_uid,
      intentResult,
      hasRagContext: false,
      ragDocumentCount: 0,
    };
  }

  @Post('chat/stream')
  async chatStream(
    @Body() body: ChatStreamBody,
    @Headers('authorization') auth: string | undefined,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    let upstreamStream: Readable | null = null;
    try {
      if (isMock()) {
        upstreamStream = this.mock.chatStream(body);
      } else {
        const token =
          process.env.WEEAI_ACCESS_TOKEN ||
          (auth?.startsWith('Bearer ') ? auth.slice(7) : undefined);
        upstreamStream = await this.upstream.chatStream(token, {
          message: body.message,
          history: [],
          model: body.model,
          userId: 0,
          conversationId: body.conversationId,
          messageId: body.messageId,
          intentResult: body.intentResult,
          hasRagContext: body.hasRagContext,
          ragDocumentCount: body.ragDocumentCount,
          disableModelSearch: body.disableModelSearch ?? true,
          parentUid: body.parentUid,
        });
      }
      upstreamStream.on('data', (chunk: Buffer | string) => {
        res.write(chunk);
      });
      upstreamStream.on('end', () => {
        res.end();
      });
      upstreamStream.on('error', (err) => {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      });
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: e?.message ?? 'stream error' })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
}

