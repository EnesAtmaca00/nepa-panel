import React from "react";
import AIStudioContent from "@/components/ai/AIStudioContent";

export default function TabAIStudio({ company }) {
  return <AIStudioContent fixedCompanyId={company.id} />;
}