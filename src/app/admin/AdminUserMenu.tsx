"use client";

import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase-client";

type SessionResponse = {
  user?: {
    email?: string | null;
  };
};

export default function AdminUserMenu() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SessionResponse | null) => {
        if (active) setEmail(data?.user?.email || null);
      })
      .catch(() => {
        if (active) setEmail(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!email) return null;

  async function handleSignOut() {
    await signOut(firebaseAuth).catch(() => undefined);
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    window.location.href = "/login";
  }

  return (
    <div className="border-t border-ink-300/60 px-5 py-4 text-xs text-ink-500">
      <div className="truncate" title={email}>
        Signed in as <span className="font-medium text-ink-700">{email}</span>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="mt-2 text-ink-500 underline-offset-2 hover:text-ink-700 hover:underline"
      >
        Sign out
      </button>
    </div>
  );
}
