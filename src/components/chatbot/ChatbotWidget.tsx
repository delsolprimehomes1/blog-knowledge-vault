import { lazy, Suspense } from "react";

const ChatbotLazy = lazy(() => import("./ChatbotMain"));

interface ChatbotWidgetProps {
  articleSlug: string;
  language: string;
}

export const ChatbotWidget = ({ articleSlug, language }: ChatbotWidgetProps) => {
  return (
    <Suspense fallback={null}>
      <ChatbotLazy articleSlug={articleSlug} language={language} />
    </Suspense>
  );
};
