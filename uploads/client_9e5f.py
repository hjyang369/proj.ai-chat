"""WeeAI API client (session cookie / Bearer; must run from allowed IP)."""
from __future__ import annotations

import json
from typing import Any, Iterator, Optional

import httpx


class WeeAI:
    def __init__(
        self,
        base: str = "https://weeai.kr",
        token: Optional[str] = None,
        cookies: Optional[dict] = None,
        timeout: float = 120.0,
    ):
        headers = {"Accept": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self._client = httpx.Client(
            base_url=base,
            headers=headers,
            cookies=cookies or {},
            timeout=timeout,
            follow_redirects=True,
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "WeeAI":
        return self

    def __exit__(self, *args) -> None:
        self.close()

    def me(self) -> dict:
        r = self._client.get("/api/me")
        r.raise_for_status()
        return r.json()

    def credit_check(self, mb_no: int, model_count: Optional[int] = None) -> dict:
        body: dict[str, Any] = {"mb_no": mb_no}
        if model_count is not None:
            body["model_count"] = model_count
        return self._client.post("/api/api-usage/credit/check", json=body).json()

    def create_conversation(self, mb_no: int, cs_title: str, pt_no=None) -> dict:
        return self._client.post(
            "/api/conversations",
            json={"mb_no": mb_no, "cs_title": cs_title, "pt_no": pt_no},
        ).json()

    def create_chat_job(self, mb_no: int, models: int, cf_no: int = 1) -> dict:
        return self._client.post(
            "/api/jobs",
            json={
                "jb_kind": "chat_multi",
                "jb_transport": "oneshot",
                "jb_runner_kind": "next",
                "mb_no": mb_no,
                "cf_no": cf_no,
                "cs_no": None,
                "ag_no": None,
                "jb_title": None,
                "jb_href": "/chat",
                "jb_input": {"models": models},
            },
        ).json()

    def save_message(self, **body) -> dict:
        return self._client.post("/api/messages", json=body).json()

    def pii_check(
        self,
        message: str,
        user_id: int,
        conversation_id: int,
        message_id: Optional[int] = None,
    ) -> dict:
        payload: dict[str, Any] = {
            "message": message,
            "attachments": [],
            "userId": user_id,
            "conversationId": conversation_id,
        }
        if message_id is not None:
            payload["messageId"] = message_id
        return self._client.post("/api/chat/pii-check", json=payload).json()

    def rag_search(
        self, cs_no: int, ms_no: int, query_text: str, score_threshold: float = 0.5
    ) -> dict:
        return self._client.post(
            "/api/rag-context/search",
            json={
                "cs_no": cs_no,
                "ms_no": ms_no,
                "pt_no": None,
                "query_text": query_text,
                "workspace_query_text": query_text,
                "score_threshold": score_threshold,
            },
        ).json()

    def analyze_complexity(
        self,
        query: str,
        rag_signal: Optional[dict] = None,
        memory_enabled: bool = False,
    ) -> dict:
        return self._client.post(
            "/api/analyze/complexity",
            json={
                "query": query,
                "recentMessages": [],
                "memoryRecentMessages": [],
                "memoryEnabled": memory_enabled,
                "ragSignal": rag_signal
                or {
                    "templateRelevant": False,
                    "workspaceRelevant": False,
                    "sources": [],
                },
            },
        ).json()

    def chat_stream(self, body: dict) -> Iterator[Any]:
        with self._client.stream("POST", "/api/chat/stream", json=body) as r:
            r.raise_for_status()
            for line in r.iter_lines():
                if not line.startswith("data: "):
                    continue
                payload = line[6:]
                if payload.strip() == "[DONE]":
                    yield "[DONE]"
                    break
                try:
                    yield json.loads(payload)
                except json.JSONDecodeError:
                    yield {"raw": payload}

    def playground_code(self, message: str) -> Iterator[dict]:
        with self._client.stream(
            "POST", "/api/playground/code", json={"message": message}
        ) as r:
            r.raise_for_status()
            for line in r.iter_lines():
                if line.startswith("data: "):
                    yield json.loads(line[6:])

    def audio_generate(self, **body) -> dict:
        body.setdefault("narrate", {"lang": None})
        return self._client.post("/api/audio/generate", json=body).json()

    def close_fanout(self, jb_uid: str, status: str = "completed", reason=None) -> dict:
        return self._client.post(
            f"/api/jobs/{jb_uid}/close-fanout",
            json={"status": status, "reason": reason},
        ).json()

    def ack_job(self, jb_uid: str, via: str = "live") -> dict:
        return self._client.post(f"/api/jobs/{jb_uid}/ack", json={"via": via}).json()

    def jobs_active(self) -> dict:
        return self._client.get("/api/jobs/active").json()

    def generate_title(self, cs_no: int) -> dict:
        return self._client.post(f"/api/conversations/{cs_no}/generate-title").json()


if __name__ == "__main__":
    print("Usage: WeeAI(token=..., cookies={'accessToken': '...'})")
    print("Requires allowed client IP. See README.md / WHERE.md.")
