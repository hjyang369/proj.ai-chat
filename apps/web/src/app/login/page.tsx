"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/stores/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { accessToken, setToken, loadFromStorage } = useAuth();
  const [value, setValue] = useState("");
  const router = useRouter();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (accessToken) {
      router.replace("/chat");
    }
  }, [accessToken, router]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setToken(value || "");
    router.replace("/chat");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
      <form
        onSubmit={onSubmit}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4"
      >
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          WeeAI Access Token
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          실서비스 토큰은 입력하지 마세요. 로컬 데모는 MOCK 모드에서 동작합니다.
          필요 시 토큰을 입력하면 BFF가 위임 호출합니다.
        </p>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Bearer 토큰 값"
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 text-white py-2 text-sm hover:bg-blue-700"
        >
          계속하기
        </button>
      </form>
    </div>
  );
}

