"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("USER STILL LOGGED IN:", user?.uid);

      if (user) {
        // ✅ PURE REDIRECT — no Firestore calls here
        router.push("/host");
      } else {
        console.log("No user logged in");
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-sm text-center space-y-2">
        <h1 className="text-lg font-semibold">Login</h1>

        <p className="text-sm text-gray-600">
          Checking authentication...
        </p>

        <p className="text-xs text-gray-400">
          Redirecting...
        </p>
      </div>
    </div>
  );
}