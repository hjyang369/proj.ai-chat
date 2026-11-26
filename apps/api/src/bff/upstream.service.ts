import axios, { AxiosInstance } from 'axios';
import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';

type CreditCheckBody = { mb_no: number; model_count?: number };

@Injectable()
export class UpstreamService {
  private buildClient(token?: string): AxiosInstance {
    const baseURL = process.env.WEEAI_BASE ?? 'https://weeai.kr';
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return axios.create({
      baseURL,
      headers,
      withCredentials: true,
      timeout: 120_000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
  }

  async me(token?: string) {
    const c = this.buildClient(token);
    const r = await c.get('/api/me');
    return r.data;
  }

  async creditCheck(token: string | undefined, body: CreditCheckBody) {
    const c = this.buildClient(token);
    const r = await c.post('/api/api-usage/credit/check', body);
    return r.data;
  }

  async createJob(
    token: string | undefined,
    mb_no: number,
    modelsCount: number,
    cf_no = 1,
  ): Promise<{ success: boolean; jb_uid: string; jb_status: string }> {
    const c = this.buildClient(token);
    const payload = {
      jb_kind: 'chat_multi',
      jb_transport: 'oneshot',
      jb_runner_kind: 'next',
      mb_no,
      cf_no,
      cs_no: null,
      ag_no: null,
      jb_title: null,
      jb_href: '/chat',
      jb_input: { models: modelsCount },
    };
    const r = await c.post('/api/jobs', payload);
    return r.data;
  }

  async createConversation(
    token: string | undefined,
    mb_no: number,
    cs_title: string,
    pt_no: number | null = null,
  ): Promise<{ cs_no: number }> {
    const c = this.buildClient(token);
    const r = await c.post('/api/conversations', {
      mb_no,
      cs_title,
      pt_no,
    });
    return r.data;
  }

  async saveMessage(
    token: string | undefined,
    body: Record<string, unknown>,
  ): Promise<{ ms_no: number }> {
    const c = this.buildClient(token);
    const r = await c.post('/api/messages', body);
    return r.data;
  }

  async analyzeComplexity(
    token: string | undefined,
    body: Record<string, unknown>,
  ) {
    const c = this.buildClient(token);
    const r = await c.post('/api/analyze/complexity', body);
    return r.data;
  }

  async ragSearch(token: string | undefined, body: Record<string, unknown>) {
    const c = this.buildClient(token);
    const r = await c.post('/api/rag-context/search', body);
    return r.data;
  }

  async chatStream(
    token: string | undefined,
    body: Record<string, unknown>,
  ): Promise<Readable> {
    const c = this.buildClient(token);
    const r = await c.post('/api/chat/stream', body, {
      responseType: 'stream',
      headers: { Accept: 'text/event-stream' },
    });
    return r.data as Readable;
  }
}

