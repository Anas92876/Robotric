/**
 * MessageInput Component
 *
 * Modern message composer with send button
 * Supports Enter to send, Shift+Enter for new line
 */

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Smile } from 'lucide-react';
import { motion } from 'framer-motion';

interface MessageInputProps {
  onSend: (message: string) => void;
  onTyping: () => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, onTyping, disabled }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (!message.trim() || disabled) return;

    onSend(message.trim());
    setMessage('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping();
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div className="border-t border-[#003300]/10 bg-white p-4">
      <div className="flex items-end gap-3">
        {/* Input area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Connecting...' : 'Type a message...'}
            disabled={disabled}
            className="w-full resize-none rounded-2xl border border-[#003300]/10 bg-[#003300]/[0.02] px-4 py-3 pr-12 text-[#003300] placeholder-[#003300]/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm leading-relaxed"
            rows={1}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />

          {/* Emoji button (placeholder for future) */}
          <button
            type="button"
            className="absolute right-3 bottom-3 p-1 text-[#003300]/30 hover:text-[#003300]/50 transition-colors"
            disabled={disabled}
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Send button */}
        <motion.button
          onClick={handleSend}
          disabled={!canSend}
          className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
            canSend
              ? 'bg-gradient-to-br from-primary to-emerald-600 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40'
              : 'bg-[#003300]/10 text-[#003300]/30 cursor-not-allowed'
          }`}
          whileHover={canSend ? { scale: 1.05 } : {}}
          whileTap={canSend ? { scale: 0.95 } : {}}
        >
          <Send className={`w-5 h-5 ${canSend ? '' : ''}`} style={{ transform: 'rotate(-45deg) translateX(1px)' }} />
        </motion.button>
      </div>

      {/* Helper text */}
      <p className="text-[11px] text-[#003300]/40 mt-2 px-1">
        Press <kbd className="px-1.5 py-0.5 bg-[#003300]/5 rounded text-[10px] font-medium">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-[#003300]/5 rounded text-[10px] font-medium">Shift + Enter</kbd> for new line
      </p>
    </div>
  );
};
