"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  // ✅ HANDLE AUTH STATE (PERSISTENCE + REDIRECT)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        console.log("USER STILL LOGGED IN:", currentUser);
        setUser(currentUser);

        // ⭐ CHECK IF USER EXISTS IN FIRESTORE
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        // ⭐ ONLY CREATE USER IF NOT EXISTS
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            name: currentUser.displayName,
            email: currentUser.email,
            createdAt: new Date(),
          });

          console.log("✅ User saved to Firestore");
        } else {
          console.log("ℹ️ User already exists in Firestore");
        }

        // 🔁 REDIRECT TO DASHBOARD
        router.push("/my-events");

      } else {
        console.log("NO USER");
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // ✅ HANDLE LOGIN
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);

      console.log("USER LOGGED IN:", result.user);

      // (Firestore save + redirect handled in onAuthStateChanged)

    } catch (error) {
      console.error("LOGIN ERROR:", error);
      alert("Login failed");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Login</h1>

      {user ? (
        <>
          <p>Welcome, {user.displayName}</p>
          <p>{user.email}</p>
          <p>Redirecting...</p>
        </>
      ) : (
        <button onClick={handleLogin}>
          Sign in with Google
        </button>
      )}
    </div>
  );
}