"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("USER STATE:", user?.uid);

      if (user) {
        router.push("/host");
      } else {
        setLoading(false); // show login button
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // redirect handled by onAuthStateChanged
    } catch (error) {
      console.error("LOGIN ERROR:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-sm text-center space-y-2">
          <h1 className="text-lg font-semibold">Login</h1>
          <p className="text-sm text-gray-600">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-sm text-center space-y-4">
        <h1 className="text-lg font-semibold">Login</h1>

        <button
          onClick={handleLogin}
          className="w-full bg-black text-white py-2 rounded-lg"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}