import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage } from '../lib/gemini';

interface AiState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  setIsOpen: (isOpen: boolean) => void;
  toggleOpen: () => void;
  addMessage: (message: ChatMessage) => void;
  setLoading: (isLoading: boolean) => void;
  clearChat: () => void;
}

export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      isOpen: false,
      messages: [
        { role: 'model', content: "Hello! I'm Omni. How can I help you today?" }
      ],
      isLoading: false,
      setIsOpen: (isOpen) => set({ isOpen }),
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      setLoading: (isLoading) => set({ isLoading }),
      clearChat: () => set({ messages: [{ role: 'model', content: "Hello! I'm Omni. How can I help you today?" }] }),
    }),
    {
      name: 'omni-ai-storage',
      partialize: (state) => ({ messages: state.messages }), // Only persist messages
    }
  )
);
