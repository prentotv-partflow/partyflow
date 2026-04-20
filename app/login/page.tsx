"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      router.replace("/my-events");
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email ?? "",
          name: user.displayName ?? "",
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("LOGIN FAILED:", error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0C12] via-[#12162B] to-[#1B1036] px-4 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-sm items-center justify-center">
        <div className="w-full rounded-3xl border border-white/10 bg-[#1B1F2C]/95 p-6 text-center shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
          <div className="mx-auto flex w-fit items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
            <Image
              src="/branding/partyflow-logo-interface.png"
              alt="PartyFlow logo"
              width={30}
              height={30}
              className="h-[30px] w-[30px] object-contain"
              priority
            />
            <span className="text-sm font-semibold tracking-tight text-white">
              PartyFlow
            </span>
          </div>

          <p className="mt-5 text-[10px] uppercase tracking-[0.22em] text-[#B8A6FF]">
            Host Sign In
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Welcome back
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/55">
            {loading
              ? "Signing you in..."
              : "Continue with Google to access your events and manage live event flow."}
          </p>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-6 w-full rounded-full border border-white/10 bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40"
          >
            {loading ? "Signing In..." : "Continue with Google"}
          </button>

          <p className="mt-3 text-xs text-white/32">
            You will be taken to your event dashboard after login.
          </p>
        </div>
      </div>
    </div>
  );
}