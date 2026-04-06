"use client";

import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useState } from "react";

export default function CreateEvent() {
  const [eventName, setEventName] = useState("");
  const [hostName, setHostName] = useState("");

  const handleSubmit = async () => {
    console.log("🔥 BUTTON CLICKED");

    if (!eventName || !hostName) {
      alert("Please fill in all fields");
      return;
    }

    try {
      console.log("🔥 Sending to Firebase...");

      // 🔥 Create event in Firebase
      const docRef = await addDoc(collection(db, "events"), {
        eventName,
        hostName,
        createdAt: new Date(),
      });

      const eventId = docRef.id;

      console.log("✅ Event created with ID:", eventId);

      // ✅ Navigate to host page with REAL event ID
      window.location.href = `/host?event=${eventId}`;
    } catch (error) {
      console.error("❌ Error creating event:", error);
      alert("Something went wrong");
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
          className="w-full bg-black text-white py-3 rounded-lg"
        >
          Continue
        </button>
      </div>
    </div>
  );
}