"use client";

import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useState } from "react";

export default function CreateEvent() {
  const [eventName, setEventName] = useState("");
  const [hostName, setHostName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    console.log("🔥 BUTTON CLICKED");

    if (!eventName || !hostName) {
      alert("Please fill in all fields");
      return;
    }

    try {
      setLoading(true); // 🔥 prevent multiple clicks

      console.log("🔥 Sending to Firebase...");

      const docRef = await addDoc(collection(db, "events"), {
        eventName,
        hostName,
        createdAt: new Date(),
      });

      const eventId = docRef.id;

      console.log("✅ Event created with ID:", eventId);

      // Redirect
      window.location.href = `/host?event=${eventId}`;
    } catch (error) {
      console.error("❌ Error creating event:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false); // 🔥 always reset
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
      </div>
    </div>
  );
}