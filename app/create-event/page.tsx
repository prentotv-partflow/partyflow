"use client";

import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateEvent() {
  const router = useRouter();

  const [eventName, setEventName] = useState("");
  const [hostName, setHostName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!eventName.trim() || !hostName.trim()) {
      alert("Please fill in all fields");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert("You must be logged in");
      return;
    }

    try {
      setLoading(true);

      const docRef = await addDoc(collection(db, "events"), {
        eventName: eventName.trim(),
        hostName: hostName.trim(),

        // 🔥 HOST INFO
        hostId: user.uid,
        hostEmail: user.email,

        // ✅ CONSISTENT ROLE SYSTEM
        roles: {
          [user.uid]: "host",
        },

        // ✅ CONSISTENT TIMESTAMP
        createdAt: serverTimestamp(),
      });

      const eventId = docRef.id;

      // ✅ STANDARDIZED NAVIGATION
      router.push(`/host?event=${eventId}`);

    } catch (error) {
      console.error("Error creating event:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* SIMPLE HEADER */}
      <div className="sticky top-0 bg-black text-white px-4 py-3 text-sm font-semibold">
        PartyFlow — Create Event
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
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

        </div>
      </div>
    </div>
  );
}