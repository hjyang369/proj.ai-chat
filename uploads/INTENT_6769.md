# Intent / routing pipeline

Captured on `/chat` multi-model send (2026-10-26).

## Order (after job + user message saved)
1. `POST /api/chat/pii-check`
2. `POST /api/rag-context/search`
3. `POST /api/analyze/complexity`  (main intent classifier)
4. Client builds stream preamble from complexity result
5. Parallel `POST /api/chat/stream` per selected model
6. Save assistant messages; `close-fanout`; optional `generate-title`

## POST /api/rag-context/search
Request example:
```json
{
  "cs_no": 41809,
  "ms_no": 313435,
  "pt_no": null,
  "query_text": "…",
  "workspace_query_text": "…",
  "score_threshold": 0.5
}
```
Empty-hit response: `has_rag_data=false`, `template_mode=gated`.

## POST /api/analyze/complexity
Runs on Gemini (`gemini-3.1-flash-lite` in capture). Returns flags like
`needsWebSearch`, `needsWeather`, `canAnswerDirectly`, `directAnswerType`,
`recommendSequentialThinking`, plus `complexity` / `score` / `reasoning`.

Mapped into stream body as:
`intentResult._complexity`, `_recommendST`, `confidence`, `reason`.
When creative + canAnswerDirectly, client prepends a Korean preamble that
tells the model not to web-search (`disableModelSearch: true`).

## POST /api/chat/stream
SSE: `data: {"content":"…","model":"<ag_model>"}` then `data: [DONE]`

## POST /api/conversations/{cs_no}/generate-title
Example: `{"success":true,"title":"…","generated":true,"method":"direct"}`
