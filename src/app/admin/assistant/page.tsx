"use client";

import { AssistantChat } from "@/components/admin/assistant/AssistantChat";

/** The chat owns the whole page (its own title bar, history and composer), so there is no separate page header. */
export default function AdminAssistantPage() {
  return (
    <div className="w-full min-w-0">
      <AssistantChat />
    </div>
  );
}
