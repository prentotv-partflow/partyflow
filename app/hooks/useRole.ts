"use client";

import { useEffect, useState } from "react";

export default function useRole() {
  const [role, setRole] = useState<"host" | "staff" | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("role") as
      | "host"
      | "staff"
      | null;

    setRole(storedRole || "staff"); // default = safest
  }, []);

  return role;
}