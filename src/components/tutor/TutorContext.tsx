import { createContext, useContext, useState, type ReactNode } from "react";

interface TutorContextValue {
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
}

const defaultTutorContextValue: TutorContextValue = {
  isOpen: false,
  openChat: () => undefined,
  closeChat: () => undefined,
  toggleChat: () => undefined,
};

const TutorContext = createContext<TutorContextValue>(defaultTutorContextValue);

export function TutorProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);
  const toggleChat = () => setIsOpen((prev) => !prev);

  return (
    <TutorContext.Provider value={{ isOpen, openChat, closeChat, toggleChat }}>
      {children}
    </TutorContext.Provider>
  );
}

export function useTutor() {
  return useContext(TutorContext);
}
