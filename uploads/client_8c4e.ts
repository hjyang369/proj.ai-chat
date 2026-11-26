/** WeeAI API client sketch (cookie/Bearer session on allowed IP) */
export class WeeAI {
  constructor(
    private base = 'https://weeai.kr',
    private token?: string,
  ) {}

  private headers(json = true): HeadersInit {
    const h: Record<string, string> = { Accept: 'application/json' };
    if (json) h['Content-Type'] = 'application/json';
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  async me() {
    const r = await fetch(`${this.base}/api/me`, {
      headers: this.headers(), credentials: 'include',
    });
    if (!r.ok) throw new Error(`me ${r.status}`);
    return r.json();
  }

  async creditCheck(mb_no: number, model_count?: number) {
    const body: Record<string, unknown> = { mb_no };
    if (model_count != null) body.model_count = model_count;
    const r = await fetch(`${this.base}/api/api-usage/credit/check`, {
      method: 'POST', headers: this.headers(), credentials: 'include',
      body: JSON.stringify(body),
    });
    return r.json();
  }

  async chatCreateJob(mb_no: number, models: number, cf_no = 1) {
    const r = await fetch(`${this.base}/api/jobs`, {
      method: 'POST', headers: this.headers(), credentials: 'include',
      body: JSON.stringify({
        jb_kind: 'chat_multi', jb_transport: 'oneshot', jb_runner_kind: 'next',
        mb_no, cf_no, cs_no: null, ag_no: null, jb_title: null,
        jb_href: '/chat', jb_input: { models },
      }),
    });
    return r.json() as Promise<{ success: boolean; jb_uid: string; jb_status: string }>;
  }

  async saveMessage(body: Record<string, unknown>) {
    const r = await fetch(`${this.base}/api/messages`, {
      method: 'POST', headers: this.headers(), credentials: 'include',
      body: JSON.stringify(body),
    });
    return r.json();
  }

  async chatStream(body: Record<string, unknown>) {
    const r = await fetch(`${this.base}/api/chat/stream`, {
      method: 'POST', headers: this.headers(), credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`chat/stream ${r.status}`);
    return r;
  }

  async *playgroundCode(message: string): AsyncGenerator<any> {
    const r = await fetch(`${this.base}/api/playground/code`, {
      method: 'POST', headers: this.headers(), credentials: 'include',
      body: JSON.stringify({ message }),
    });
    if (!r.ok || !r.body) throw new Error(`playground/code ${r.status}`);
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop() || '';
      for (const part of parts) {
        const line = part.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        yield JSON.parse(line.slice(6));
      }
    }
  }

  async audioGenerate(body: {
    mode: 'simple' | 'custom'; description?: string; agNo: number;
    mbNo: number; conversationId: number; messageId: number;
  }) {
    const r = await fetch(`${this.base}/api/audio/generate`, {
      method: 'POST', headers: this.headers(), credentials: 'include',
      body: JSON.stringify({ ...body, narrate: { lang: null } }),
    });
    return r.json();
  }

  async ackJob(jb_uid: string, via = 'live') {
    const r = await fetch(`${this.base}/api/jobs/${jb_uid}/ack`, {
      method: 'POST', headers: this.headers(), credentials: 'include',
      body: JSON.stringify({ via }),
    });
    return r.json();
  }

  async closeFanout(jb_uid: string, status = 'completed', reason: string | null = null) {
    const r = await fetch(`${this.base}/api/jobs/${jb_uid}/close-fanout`, {
      method: 'POST', headers: this.headers(), credentials: 'include',
      body: JSON.stringify({ status, reason }),
    });
    return r.json();
  }

  async jobsActive() {
    const r = await fetch(`${this.base}/api/jobs/active`, {
      headers: this.headers(), credentials: 'include',
    });
    return r.json();
  }
}
