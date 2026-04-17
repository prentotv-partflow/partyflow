"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

type Role = "host" | "staff" | "guest" | null;

export default function useRole(eventId?: string) {
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const user = auth.currentUser;

        if (!user || !eventId) {
          setRole("guest");
          setLoading(false);
          return;
        }

        const eventRef = doc(db, "events", eventId);
        const snap = await getDoc(eventRef);

        if (!snap.exists()) {
          setRole("guest");
          setLoading(false);
          return;
        }

        const data = snap.data();
        const roles = data.roles || {};

        const userRole = roles[user.uid] || "guest";

        setRole(userRole);
      } catch (error) {
        console.error("Failed to resolve role:", error);
        setRole("guest");
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [eventId]);

  return { role, loading };
}