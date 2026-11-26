# WeeAI reverse engineering pack

openapi **v0.3.0** · Asia/Seoul

## Where
`/Users/uaround04/weeai-re/` — open with `open ~/weeai-re`  
Details: [WHERE.md](WHERE.md)

## Files
| Path | What |
|------|------|
| openapi.json | OpenAPI 3.0 |
| client.ts | TypeScript client |
| client.py | Python client (httpx) |
| INTENT.md | Intent / RAG / complexity |
| WHERE.md | How to find artifacts |

Raw captures (parent folder): `chat-api-log.json`, `api-log.json`, `weeai.har` (private).

## Auth
Cookie `accessToken` or `Authorization: Bearer …` · IP allowlist applies.

## Chat multi flow
1. credit/check
2. POST /api/jobs (chat_multi)
3. POST /api/conversations → cs_no
4. POST /api/messages (user)
5. pii-check → rag-context/search → analyze/complexity
6. parallel POST /api/chat/stream per model
7. save assistants → close-fanout → generate-title

## Python
```bash
pip install httpx
cd ~/weeai-re/docs
python -c "from client import WeeAI; print(WeeAI(token='…').me())"
```
