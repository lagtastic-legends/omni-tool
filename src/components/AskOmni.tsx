'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Trash2, Bot, User } from 'lucide-react';
import { useAiStore } from '../store/useAiStore';
import { generateAiResponse } from '../lib/gemini';

export default function AskOmni() {
  const { isOpen, toggleOpen, messages, addMessage, updateLastMessage, isLoading, setLoading, clearChat } = useAiStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userText });
    setLoading(true);

    try {
      const updatedMessages = [...messages, { role: 'user' as const, content: userText }];
      const { streamAiResponse } = await import('../lib/gemini');
      const stream = streamAiResponse(updatedMessages);
      
      addMessage({ role: 'model', content: '' });
      let fullContent = '';
      setLoading(false); // Stop loading animation immediately once streaming starts
      
      for await (const chunk of stream) {
        fullContent += chunk;
        updateLastMessage(fullContent);
      }
    } catch (error) {
      updateLastMessage('Connection to Omni network failed. Please try again later.');
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={toggleOpen}
        className="fixed bottom-24 right-6 z-50 p-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all duration-300 transform hover:scale-105 active:scale-95"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Chat Window Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-[400px] h-[600px] max-h-[80vh] z-50 rounded-2xl bg-zinc-950/95 backdrop-blur-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-white">Ask Omni</h3>
                  <p className="text-xs text-white/50 font-mono">AI Assistant v1.0</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearChat}
                  className="p-2 text-white/50 hover:text-error transition-colors rounded-lg hover:bg-white/5"
                  title="Clear Chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleOpen}
                  className="p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20 scrollbar-hide">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-zinc-900/60 border border-white/10 text-white rounded-tl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap font-body leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm p-4 bg-zinc-900/60 border border-white/10">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-md">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask Omni anything..."
                  className="w-full bg-zinc-800/30 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-2 rounded-lg text-primary hover:bg-primary/10 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
