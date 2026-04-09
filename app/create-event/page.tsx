"use client";

import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";

export default function CreateEvent() {
  const [eventName, setEventName] = useState("");
  const [hostName, setHostName] = useState("");
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState<any>(null);

  // 🔐 Track logged-in user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      console.log("👤 USER:", u);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async () => {
    console.log("🔥 BUTTON CLICKED");

    if (!eventName || !hostName) {
      alert("Please fill in all fields");
      return;
    }

    if (!user) {
      alert("You must be logged in to create an event");
      return;
    }

    try {
      setLoading(true);

      console.log("🔥 Sending to Firebase...");

      const docRef = await addDoc(collection(db, "events"), {
        eventName,
        hostName,
        hostId: user.uid, // 🔐 THIS IS THE KEY
        createdAt: serverTimestamp(),
      });

      const eventId = docRef.id;

      console.log("✅ Event created with ID:", eventId);

      // Redirect
      window.location.href = `/host?event=${eventId}`;
    } catch (error) {
      console.error("❌ Error creating event:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-sm bg-white p-5 rounded-2xl shadow-md">
        <h1 className="text-xl font-bold mb-4 text-center">
          Create Party 🎉
        </h1>

        <input
          type="text"
          placeholder="Event Name"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          className="w-full mb-3 p-3 border rounded-lg text-black"
        />

        <input
          type="text"
          placeholder="Your Name (Host)"
          value={hostName}
          onChange={(e) => setHostName(e.target.value)}
          className="w-full mb-4 p-3 border rounded-lg text-black"
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full py-3 rounded-lg text-white ${
            loading ? "bg-gray-400" : "bg-black"
          }`}
        >
          {loading ? "Creating..." : "Continue"}
        </button>

        {!user && (
          <p className="text-xs text-red-500 text-center mt-3">
            ⚠️ You must log in before creating an event
          </p>
        )}
      </div>
    </div>
  );
}