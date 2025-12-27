
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { Role, Message, Conversation, Theme } from './types';
import { ChatInput } from './components/ChatInput';
import { ChatMessage } from './components/ChatMessage';
import { ModelIcon, SettingsIcon, ErrorIcon, SearchIcon, ClearIcon, MenuIcon, NewChatIcon, SaveIcon, CheckIcon } from './components/icons';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import { ConfirmationModal } from './components/ConfirmationModal';

const DEFAULT_SYSTEM_INSTRUCTION = 'You are a helpful and friendly AI assistant named Mitra. Format your responses using markdown where appropriate, especially for code blocks. After your main response, on separate lines, provide 3 concise and relevant follow-up suggestions, each prefixed with `SUGGESTION: `.';

const createNewConversation = (): Conversation => ({
  id: Date.now().toString(),
  title: 'New Chat',
  messages: [
    {
      id: Date.now(),
      role: Role.MODEL,
      content: "Hello! I'm Mitra, your AI Assistant. How can I help you today?",
    },
  ],
});

const themes: Theme[] = [
    { name: 'Cyan', colors: { '--primary-400': '#22d3ee', '--primary-500': '#06b6d4', '--primary-600': '#0891b2' } },
    { name: 'Rose', colors: { '--primary-400': '#fb7185', '--primary-500': '#f43f5e', '--primary-600': '#e11d48' } },
    { name: 'Green', colors: { '--primary-400': '#4ade80', '--primary-500': '#22c55e', '--primary-600': '#16a34a' } },
    { name: 'Violet', colors: { '--primary-400': '#a78bfa', '--primary-500': '#8b5cf6', '--primary-600': '#7c3aed' } },
    { name: 'Amber', colors: { '--primary-400': '#fbbf24', '--primary-500': '#f59e0b', '--primary-600': '#d97706' } },
];

export const App: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [systemInstruction, setSystemInstruction] = useState(DEFAULT_SYSTEM_INSTRUCTION);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isJustSaved, setIsJustSaved] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'female' | 'male'>('female');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activeTheme, setActiveTheme] = useState<Theme>(themes[0]);
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText: string;
    confirmButtonClass: string;
  } | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const ai = useMemo(() => {
    if (!process.env.API_KEY) return null;
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }, []);

  useEffect(() => {
    const savedThemeName = localStorage.getItem('mitra-theme');
    const savedTheme = themes.find(t => t.name === savedThemeName) || themes[0];
    setActiveTheme(savedTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    // FIX: Cast the value to string to ensure it matches the expected signature of setProperty.
    for (const [key, value] of Object.entries(activeTheme.colors)) {
        root.style.setProperty(key, value as string);
    }
    localStorage.setItem('mitra-theme', activeTheme.name);
  }, [activeTheme]);

  useEffect(() => {
    const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) setVoices(availableVoices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mitra-conversations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setConversations(parsed);
          setActiveConversationId(parsed[0].id);
          return;
        }
      }
    } catch (e) {
      console.error("Storage error", e);
    }
    const newConv = createNewConversation();
    setConversations([newConv]);
    setActiveConversationId(newConv.id);
  }, []);

  useEffect(() => {
    if (conversations.length > 0) localStorage.setItem('mitra-conversations', JSON.stringify(conversations));
  }, [conversations]);

  const activeConversation = useMemo(() => conversations.find(c => c.id === activeConversationId), [conversations, activeConversationId]);
  const chatHistory = useMemo(() => activeConversation?.messages || [], [activeConversation]);
  
  useEffect(() => {
    if (!activeConversation || !ai) return;
    const newChat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction },
    });
    setChat(newChat);
  }, [systemInstruction, activeConversationId, ai]);

  useEffect(() => {
    if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [chatHistory]);

  const handleSpeak = (message: Message) => {
    if (!message.content || typeof window.speechSynthesis === 'undefined' || voices.length === 0) return;
    if (speakingMessageId === message.id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.content);
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));
    const desiredVoice = englishVoices.find(v => selectedVoice === 'female' ? /female/i.test(v.name) : /male/i.test(v.name));
    utterance.voice = desiredVoice || englishVoices[0];
    utteranceRef.current = utterance;
    utterance.onend = () => { if (utteranceRef.current === utterance) setSpeakingMessageId(null); };
    setSpeakingMessageId(message.id);
    window.speechSynthesis.speak(utterance);
  };
  
  const handleSendMessage = useCallback(async (userInput: string, image?: string) => {
    if (!activeConversationId) return;
    window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
    setIsLoading(true);
    setError(null);

    if (userInput.toLowerCase().startsWith('/imagine ')) {
        const prompt = userInput.substring(8).trim();
        if (!ai) { setError("AI Client not initialized."); setIsLoading(false); return; }
        const userMsg: Message = { id: Date.now(), role: Role.USER, content: userInput };
        const modelMsg: Message = { id: Date.now() + 1, role: Role.MODEL, content: 'Generating image...' };
        setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages: [...c.messages, userMsg, modelMsg] } : c));
        try {
            const resp = await ai.models.generateImages({ model: 'imagen-4.0-generate-001', prompt, config: { numberOfImages: 1 } });
            const imageUrl = `data:image/png;base64,${resp.generatedImages[0].image.imageBytes}`;
            setConversations(prev => prev.map(c => {
                if (c.id === activeConversationId) {
                    const msgs = [...c.messages];
                    const last = msgs[msgs.length - 1];
                    last.content = `Image result for: "${prompt}"`;
                    last.image = imageUrl;
                    return { ...c, messages: msgs };
                }
                return c;
            }));
        } catch (e) {
            setError("Image generation failed.");
        } finally { setIsLoading(false); }
        return;
    }
    
    if (!chat) { setIsLoading(false); return; }
    const userMsg: Message = { id: Date.now(), role: Role.USER, content: userInput, image };
    const modelMsg: Message = { id: Date.now() + 1, role: Role.MODEL, content: '' };
    setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages: [...c.messages, userMsg, modelMsg] } : c));
    
    const parts = [];
    if (image) {
        const match = image.match(/^data:(image\/.+);base64,(.+)$/);
        if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
    if (userInput) parts.push({ text: userInput });

    try {
      const stream = await chat.sendMessageStream({ message: parts });
      for await (const chunk of stream) {
        setConversations(prev => prev.map(c => {
            if (c.id === activeConversationId) {
                const msgs = [...c.messages];
                msgs[msgs.length - 1].content += chunk.text;
                return { ...c, messages: msgs };
            }
            return c;
        }));
      }
    } catch (e) {
      setError("Response failed.");
    } finally {
      setIsLoading(false);
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
            const msgs = [...c.messages];
            const last = msgs[msgs.length - 1];
            const lines = last.content.split('\n');
            last.suggestions = lines.filter(l => l.startsWith('SUGGESTION: ')).map(l => l.replace('SUGGESTION: ', '').trim());
            last.content = lines.filter(l => !l.startsWith('SUGGESTION: ')).join('\n').trim();
            return { ...c, messages: msgs };
        }
        return c;
      }));
    }
  }, [activeConversationId, ai, chat]);

  const handleNewConversation = useCallback((options: { force?: boolean, source?: 'clear' | 'new' } = {}) => {
    const { force = false, source = 'new' } = options;
    const start = () => {
      window.speechSynthesis.cancel();
      const newConv = createNewConversation();
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    };
    if (force || activeConversation?.messages.length === 1) { start(); return; }
    setConfirmation({
        isOpen: true,
        title: source === 'clear' ? 'Clear Chat' : 'New Chat',
        message: 'Proceed with this action?',
        onConfirm: start,
        confirmText: 'Yes',
        confirmButtonClass: 'bg-[var(--primary-600)] hover:bg-[var(--primary-500)]'
    });
  }, [activeConversation]);

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return chatHistory;
    return chatHistory.filter(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [chatHistory, searchQuery]);

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => { setActiveConversationId(id); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
        onNewConversation={() => handleNewConversation()}
        onDeleteConversation={(id) => setConversations(conversations.filter(c => c.id !== id))}
        onRenameConversation={(id, title) => setConversations(conversations.map(c => c.id === id ? { ...c, title } : c))}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      
      <div className="flex flex-col flex-1 h-full relative overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl z-20">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 text-gray-400 hover:text-white rounded-lg transition-colors">
                    <MenuIcon className="w-6 h-6" />
                </button>
                <h1 className="text-sm sm:text-lg font-bold truncate max-w-[120px] sm:max-w-xs">{activeConversation?.title || 'Mitra'}</h1>
            </div>

            <div className="flex-1 max-w-sm px-4 hidden sm:block">
                <div className="relative group">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[var(--primary-400)]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search chat..."
                        className="w-full bg-gray-800 text-sm rounded-full py-2 pl-9 pr-4 focus:ring-1 focus:ring-[var(--primary-500)] focus:bg-gray-700 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors" aria-label="Settings">
                    <SettingsIcon className="w-5 h-5" />
                </button>
                <button onClick={() => { localStorage.setItem('mitra-conversations', JSON.stringify(conversations)); setIsJustSaved(true); setTimeout(() => setIsJustSaved(false), 2000); }} className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors">
                    {isJustSaved ? <CheckIcon className="w-5 h-5 text-green-400" /> : <SaveIcon className="w-5 h-5" />}
                </button>
            </div>
        </header>
        
        <main ref={chatContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 custom-scrollbar">
          <div className="max-w-4xl mx-auto">
            {filteredHistory.length === 0 && searchQuery && (
                <div className="text-center py-20">
                    <p className="text-gray-500 italic">No messages found matching your search.</p>
                </div>
            )}
            {filteredHistory.map((msg, idx) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isLastMessage={!isLoading && idx === filteredHistory.length - 1}
                onSuggestionClick={handleSendMessage}
                onSpeak={handleSpeak}
                isSpeaking={speakingMessageId === msg.id}
                searchQuery={searchQuery}
                onClearChat={() => handleNewConversation({ source: 'clear' })}
                onRegenerate={() => handleSendMessage(chatHistory[chatHistory.length-2].content, chatHistory[chatHistory.length-2].image)}
              />
            ))}
            {error && (
              <div className="my-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3 animate-pulse">
                <ErrorIcon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
          </div>
        </main>
        
        <footer className="w-full flex-shrink-0 z-10">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} setError={setError} />
        </footer>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(p) => { setSystemInstruction(p); handleNewConversation({ force: true }); setIsSettingsOpen(false); }}
          currentPrompt={systemInstruction}
          selectedVoice={selectedVoice}
          onVoiceChange={setSelectedVoice}
          themes={themes}
          activeTheme={activeTheme}
          onThemeChange={setActiveTheme}
        />
        {confirmation && (
          <ConfirmationModal
            isOpen={confirmation.isOpen}
            onClose={() => setConfirmation(null)}
            onConfirm={confirmation.onConfirm}
            title={confirmation.title}
            message={confirmation.message}
            confirmText={confirmation.confirmText}
            confirmButtonClass={confirmation.confirmButtonClass}
          />
        )}
      </div>
    </div>
  );
};
