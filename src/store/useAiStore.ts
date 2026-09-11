import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage } from '../lib/gemini';

interface AiState {
  isOpen: boolean;
  isExpanded: boolean;
  isStreaming: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  setIsOpen: (isOpen: boolean) => void;
  toggleOpen: () => void;
  setIsExpanded: (isExpanded: boolean) => void;
  toggleExpanded: () => void;
  setStreaming: (isStreaming: boolean) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  removeLastMessage: () => void;
  setLoading: (isLoading: boolean) => void;
  clearChat: () => void;
}

export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      isOpen: false,
      isExpanded: false,
      isStreaming: false,
      messages: [
        {
          id: 'welcome-msg',
          role: 'model',
          content: "Hello! I'm **Omni**, your client-side AI co-pilot. I can guide you through video compression, vocal cancellation, 8D audio, PDF tools, and local storage.",
          timestamp: Date.now(),
        }
      ],
      isLoading: false,
      setIsOpen: (isOpen) => set({ isOpen }),
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      setIsExpanded: (isExpanded) => set({ isExpanded }),
      toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),
      setStreaming: (isStreaming) => set({ isStreaming }),
      addMessage: (message) => set((state) => ({
        messages: [
          ...state.messages,
          {
            ...message,
            id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            timestamp: message.timestamp || Date.now(),
          }
        ]
      })),
      updateLastMessage: (content) => set((state) => {
        const newMessages = [...state.messages];
        if (newMessages.length > 0) {
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            content,
          };
        }
        return { messages: newMessages };
      }),
      removeLastMessage: () => set((state) => ({
        messages: state.messages.slice(0, -1),
      })),
      setLoading: (isLoading) => set({ isLoading }),
      clearChat: () => set({
        messages: [
          {
            id: `welcome-${Date.now()}`,
            role: 'model',
            content: "Hello! I'm **Omni**, your client-side AI co-pilot. How can I help you today?",
            timestamp: Date.now(),
          }
        ]
      }),
    }),
    {
      name: 'omni-ai-storage',
      partialize: (state) => ({ messages: state.messages, isExpanded: state.isExpanded }),
    }
  )
);
