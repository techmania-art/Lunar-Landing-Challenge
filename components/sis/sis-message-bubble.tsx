import React from "react";
import { Bot, User, Mic } from "lucide-react";
import type { SISMessage } from "./sis-types";

export interface SISMessageBubbleProps {
  message: SISMessage;
}

export function SISMessageBubble({ message }: SISMessageBubbleProps) {
  const isUser = message.sender === "user";

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 items-end">
        <div className="max-w-[85%] space-y-1">
          <div className="rounded-2xl rounded-tr-sm bg-sky-100 border border-sky-200/80 px-3.5 py-2.5 text-xs sm:text-sm text-sky-950 shadow-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.text}
          </div>
          <div className="flex items-center justify-end gap-1 px-1 text-[10px] text-stone-400">
            {message.isVoice && (
              <span className="flex items-center gap-0.5 text-sky-600 font-medium" title="Spoken input">
                <Mic className="h-2.5 w-2.5" aria-hidden="true" />
                <span>Voice</span>
              </span>
            )}
            {message.timestamp && <span>{message.timestamp}</span>}
          </div>
        </div>
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-xs">
          <User className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2 items-start">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xs ring-1 ring-orange-400/40 mt-0.5">
        <Bot className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="max-w-[85%] space-y-1">
        <div className="rounded-2xl rounded-tl-sm bg-[#F5EFEB] border border-[#E7DDD3] px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 shadow-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.text}
        </div>
        {message.timestamp && (
          <p className="text-[10px] text-stone-400 px-1">
            {message.timestamp}
          </p>
        )}
      </div>
    </div>
  );
}
