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
      content: "Hello! I'm Mitra, your Gemini-powered AI Assistant. How can I help you today?",
    },
  ],
});

const themes: Theme[] = [
    { name: 'Cyan', colors: { '--primary-400': '#22d3ee', '--primary-500': '#06b6d4', '--primary-600': '#0891b2' } },
    { name: 'Rose', colors: { '--primary-400': '#fb7185', '--primary-500': '#f43f5e', '--primary-600': '#e11d48' } },
    { name: 'Green', colors: { '--primary-400': '#4ade80', '--primary-500': '#22c55e', '--primary-600': '#16a34a' } },
    { name: 'Violet', colors: { '--primary-400': '#a78bfa', '--primary-500': '#8b5cf6', '--primary-600': '#7c3aed' } },
    { name: 'Amber', colors: { '--primary-400': '#fbbf24', '--primary-500': '#f59e0b', '--primary-600': '#d97706' } },
    { name: 'Indigo', colors: { '--primary-400': '#818cf8', '--primary-500': '#6366f1', '--primary-600': '#4f46e5' } },
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
      }
      return new GoogleGenAI({ apiKey: process.env.API_KEY });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during initialization.";
      console.error(e);
      setError(`Initialization failed: ${errorMessage}`);
      return null;
    }
  }, []);
  
  // Load and apply theme from local storage
  useEffect(() => {
    const savedThemeName = localStorage.getItem('mitra-theme');
    const savedTheme = themes.find(t => t.name === savedThemeName) || themes[0];
    setActiveTheme(savedTheme);
  }, []);

  // Apply theme colors to CSS variables whenever the active theme changes
  useEffect(() => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(activeTheme.colors)) {
        root.style.setProperty(key, value);
    }
    localStorage.setItem('mitra-theme', activeTheme.name);
  }, [activeTheme]);

  useEffect(() => {
    const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
            setVoices(availableVoices);
        }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);
  
  // Load conversations from local storage on initial render
  useEffect(() => {
    try {
      const savedConversationsRaw = localStorage.getItem('mitra-conversations');
      if (savedConversationsRaw) {
        const savedConversations = JSON.parse(savedConversationsRaw);
        if (Array.isArray(savedConversations) && savedConversations.length > 0) {
          setConversations(savedConversations);
          setActiveConversationId(savedConversations[0].id);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to load conversations from local storage:", e);
      localStorage.removeItem('mitra-conversations'); // Clear corrupted data
    }
    // If nothing loaded, create a new conversation
    const newConversation = createNewConversation();
    setConversations([newConversation]);
    setActiveConversationId(newConversation.id);
  }, []);

  // Save conversations to local storage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('mitra-conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  const chatHistory = useMemo(() => {
    return activeConversation?.messages || [];
  }, [activeConversation]);
  
  // Re-initialize chat when system instruction or active conversation changes
  useEffect(() => {
    if (!activeConversation || !ai) return;
    
    const newChat = ai.chats.create({
      model: 'gemini-2.5-flash', // FIX: Corrected model name for multimodal support
      config: {
        systemInstruction: systemInstruction,
      },
    });
    setChat(newChat);
  }, [systemInstruction, activeConversationId, ai]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
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
    
    // More robust voice selection: find a high-quality English voice based on user preference.
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));
    let desiredVoice: SpeechSynthesisVoice | undefined;

    if (selectedVoice === 'female') {
        // Prioritize voices with 'Female' in the name, then any voice that isn't explicitly male.
        desiredVoice = englishVoices.find(v => /female/i.test(v.name) && !/male/i.test(v.name)) 
            || englishVoices.find(v => !/male/i.test(v.name));
    } else { // male
        // Prioritize voices with 'Male' in the name, then any voice that isn't explicitly female.
        desiredVoice = englishVoices.find(v => /male/i.test(v.name) && !/female/i.test(v.name))
            || englishVoices.find(v => !/female/i.test(v.name));
    }
    
    // Fallback to the browser's default voice for the language if available, then the first available English voice.
    utterance.voice = desiredVoice 
        || englishVoices.find(v => v.default) 
        || englishVoices[0] 
        || null;

    utteranceRef.current = utterance;

    utterance.onend = () => {
      if (utteranceRef.current === utterance) {
        setSpeakingMessageId(null);
        utteranceRef.current = null;
      }
    };
    utterance.onerror = (event) => {
      // The 'interrupted' error is expected when the user cancels speech or starts a new one.
      // We can safely ignore it and just clean up the state without showing an error message.
      if (event.error !== 'interrupted') {
        console.error('SpeechSynthesis Error:', event.error);
        setError('An error occurred during speech synthesis.');
      }
      
      if (utteranceRef.current === utterance) {
        setSpeakingMessageId(null);
        utteranceRef.current = null;
      }
    };

    setSpeakingMessageId(message.id);
    window.speechSynthesis.speak(utterance);
  };
  
  const handleSendMessage = useCallback(async (userInput: string, image?: string) => {
    if (!activeConversationId) {
      setError("No active conversation. Please select or create one.");
      return;
    }
    
    window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
    setIsLoading(true);
    setError(null);

    // Handle image generation command
    if (userInput.toLowerCase().startsWith('/imagine ')) {
        const prompt = userInput.substring(8).trim();
        if (!ai) {
            setError("AI Client not initialized.");
            setIsLoading(false);
            return;
        }

        const userMessage: Message = { id: Date.now(), role: Role.USER, content: userInput };
        const modelMessagePlaceholder: Message = { id: Date.now() + 1, role: Role.MODEL, content: 'Generating image...' };

        setConversations(prev => prev.map(conv => {
            if (conv.id === activeConversationId) {
                const newTitle = conv.title === 'New Chat' ? `Image: ${prompt.substring(0, 20)}...` : conv.title;
                return { ...conv, title: newTitle, messages: [...conv.messages, userMessage, modelMessagePlaceholder] };
            }
            return conv;
        }));
        
        try {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: { numberOfImages: 1 },
            });
            
            const generatedImage = response.generatedImages[0];
            if (!generatedImage || !generatedImage.image.imageBytes) {
                throw new Error("Image generation failed to return an image.");
            }
            const imageUrl = `data:image/png;base64,${generatedImage.image.imageBytes}`;

            setConversations(prev => prev.map(conv => {
                if (conv.id === activeConversationId) {
                    const newMessages = [...conv.messages];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage.content === 'Generating image...') {
                        lastMessage.content = `Generated image for: "${prompt}"`;
                        lastMessage.image = imageUrl;
                    }
                    return { ...conv, messages: newMessages };
                }
                return conv;
            }));

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
            console.error("Image generation error:", e);
            setError(`Image generation failed: ${errorMessage}`);
            setConversations(prev => prev.map(conv => {
                 if (conv.id === activeConversationId) {
                    const newMessages = [...conv.messages];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage.content === 'Generating image...') {
                        lastMessage.content = `Sorry, I couldn't generate an image for that prompt. Please try again.`;
                    }
                    return { ...conv, messages: newMessages };
                }
                return conv;
            }));
        } finally {
            setIsLoading(false);
        }
        return; // End execution for image generation
    }
    
    // Original chat message logic
    if (!chat) {
      setError("Chat is not initialized. Please check your API key or select a conversation.");
      setIsLoading(false);
      return;
    }

    const userMessage: Message = { id: Date.now(), role: Role.USER, content: userInput, image };
    const modelMessagePlaceholder: Message = { id: Date.now() + 1, role: Role.MODEL, content: '', suggestions: [] };

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        const newTitle = conv.title === 'New Chat' && userInput ? userInput.substring(0, 30) + (userInput.length > 30 ? '...' : '') : conv.title;
        return {
          ...conv,
          title: newTitle,
          messages: [...conv.messages, userMessage, modelMessagePlaceholder]
        };
      }
      return conv;
    }));
    
    const parts = [];
    if (image) {
        const match = image.match(/^data:(image\/.+);base64,(.+)$/);
        if (match) {
            parts.push({
                inlineData: { mimeType: match[1], data: match[2] }
            });
        }
    }
    if (userInput) {
        parts.push({ text: userInput });
    }

    try {
      const stream = await chat.sendMessageStream({ message: parts });

      for await (const chunk of stream) {
        const textChunk = chunk.text;
        setConversations(prev => prev.map(conv => {
            if (conv.id === activeConversationId) {
                const newMessages = [...conv.messages];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === Role.MODEL) {
                    lastMessage.content += textChunk;
                }
                return { ...conv, messages: newMessages };
            }
            return conv;
        }));
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      console.error(e);
      setError(`Error generating response: ${errorMessage}`);
       setConversations(prev => prev.map(conv => {
            if (conv.id === activeConversationId) {
                const newMessages = [...conv.messages];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === Role.MODEL && lastMessage.content === '') {
                    lastMessage.content = "Sorry, I encountered an error. Please try again.";
                }
                return { ...conv, messages: newMessages };
            }
            return conv;
        }));
    } finally {
      setIsLoading(false);
      setConversations(prev => prev.map(conv => {
        if (conv.id === activeConversationId) {
            const newMessages = [...conv.messages];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage?.role === Role.MODEL) {
                const lines = lastMessage.content.split('\n');
                const suggestions = lines
                    .filter(line => line.startsWith('SUGGESTION: '))
                    .map(line => line.replace('SUGGESTION: ', '').trim())
                    .filter(suggestion => suggestion);
                const cleanContent = lines
                    .filter(line => !line.startsWith('SUGGESTION: '))
                    .join('\n')
                    .trim();
                lastMessage.content = cleanContent;
                lastMessage.suggestions = suggestions.length > 0 ? suggestions : undefined;
                if (cleanContent) {
                  handleSpeak(lastMessage);
                }
            }
            return { ...conv, messages: newMessages };
        }
        return conv;
      }));
    }
  }, [activeConversationId, ai, chat]);

  const handleRegenerateResponse = useCallback(() => {
    if (!activeConversationId || isLoading) return;

    const currentConversation = conversations.find(c => c.id === activeConversationId);
    if (!currentConversation || currentConversation.messages.length < 2) return;

    const lastMessage = currentConversation.messages[currentConversation.messages.length - 1];
    const secondLastMessage = currentConversation.messages[currentConversation.messages.length - 2];

    // We can only regenerate if the last message is from the model and the one before it is from the user.
    if (lastMessage.role === Role.MODEL && secondLastMessage.role === Role.USER) {
      const lastUserPrompt = secondLastMessage;
      
      // Remove the last model response from the state
      setConversations(prev => prev.map(conv => {
        if (conv.id === activeConversationId) {
          // Slice off the last message
          return { ...conv, messages: conv.messages.slice(0, -1) };
        }
        return conv;
      }));

      // Resend the user's prompt
      setTimeout(() => {
        handleSendMessage(lastUserPrompt.content, lastUserPrompt.image);
      }, 50); // Timeout to allow React to process the state update before sending the new message
    }
  }, [conversations, activeConversationId, isLoading, handleSendMessage]);

  const handleSaveSystemInstruction = (newPrompt: string) => {
    window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
    setSystemInstruction(newPrompt);
    handleNewConversation({ force: true }); // Force new conversation without confirmation
    setIsSettingsOpen(false);
  };
  
  const handleSelectConversation = (id: string) => {
    if (activeConversationId !== id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      setActiveConversationId(id);
      setError(null);
      setSearchQuery('');
    }
  };
  
  const handleDeleteConversation = (id: string) => {
    setConfirmation({
      isOpen: true,
      title: 'Delete Conversation',
      message: 'Are you sure you want to permanently delete this chat? This action cannot be undone.',
      onConfirm: () => {
        const remainingConversations = conversations.filter(c => c.id !== id);
        setConversations(remainingConversations);
        
        if (activeConversationId === id) {
          if (remainingConversations.length > 0) {
            setActiveConversationId(remainingConversations[0].id);
          } else {
            const newConv = createNewConversation();
            setConversations([newConv]);
            setActiveConversationId(newConv.id);
          }
        }
      },
      confirmText: 'Delete',
      confirmButtonClass: 'bg-red-600 hover:bg-red-500 focus-visible:ring-red-500'
    });
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === id ? { ...conv, title: newTitle } : conv
    ));
  };

  const handleSaveChat = useCallback(() => {
    try {
      if (conversations.length > 0) {
        localStorage.setItem('mitra-conversations', JSON.stringify(conversations));
      }
      setIsJustSaved(true);
      setTimeout(() => setIsJustSaved(false), 2000);
    } catch (e) {
      console.error("Failed to manually save conversations:", e);
      setError("Failed to save chat. Your browser's local storage might be full or disabled.");
    }
  }, [conversations]);

  const handleNewConversation = useCallback((options: { force?: boolean, source?: 'clear' | 'new' } = {}) => {
    const { force = false, source = 'new' } = options;
    const startNewChat = () => {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      setIsLoading(false);
      setError(null);
      setSearchQuery('');
      const newConversation = createNewConversation();
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversationId(newConversation.id);
    };

    const currentChatHasContent = activeConversation && activeConversation.messages.length > 1;
    if (force || !currentChatHasContent) {
      startNewChat();
      return;
    }

    const title = source === 'clear' ? 'Clear Chat' : 'Start New Chat';
    const message = source === 'clear' 
        ? 'Are you sure you want to clear this conversation and start a new one?'
        : 'Are you sure you want to start a new chat? Your current conversation will be saved.';

    setConfirmation({
        isOpen: true,
        title,
        message,
        onConfirm: startNewChat,
        confirmText: source === 'clear' ? 'Clear' : 'Start New',
        confirmButtonClass: 'bg-[var(--primary-600)] hover:bg-[var(--primary-500)] focus-visible:ring-[var(--primary-500)]'
    });
  }, [activeConversation]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      const key = event.key.toLowerCase();

      // Check for modifier keys (Ctrl on Windows/Linux, Cmd on Mac)
      if (event.ctrlKey || event.metaKey) {
        if (key === 'n') {
          event.preventDefault();
          handleNewConversation();
        }
        if (key === 's') {
          event.preventDefault();
          handleSaveChat();
        }
      }
      
      if (event.key === 'Escape') {
        // Close mobile sidebar if it's open
        if (isSidebarOpen && window.innerWidth < 768) {
          event.preventDefault();
          setIsSidebarOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isSidebarOpen, handleNewConversation, handleSaveChat]);

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) {
      return chatHistory;
    }
    return chatHistory.filter(msg => 
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [chatHistory, searchQuery]);

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={() => handleNewConversation()}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <div className="flex flex-col flex-1 h-screen relative">
        <header className="bg-gray-800/80 backdrop-blur-sm shadow-md p-4 flex items-center justify-between gap-3 border-b border-gray-700/50 z-20 flex-shrink-0">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] md:hidden"
                    aria-label="Toggle sidebar"
                >
                    <MenuIcon className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[var(--primary-600)] rounded-lg shadow-md hidden sm:block">
                        <ModelIcon className="w-6 h-6"/>
                    </div>
                    <h1 className="text-xl font-semibold tracking-wide truncate">{activeConversation?.title || 'Mitra'}</h1>
                </div>
            </div>
            <div className="flex-1 flex justify-center px-4">
                <div className="relative w-full max-w-md">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <SearchIcon className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search conversation..."
                        className="w-full bg-gray-700/80 text-gray-200 border border-gray-600 rounded-full py-2 pl-10 pr-10 focus:ring-2 focus:ring-[var(--primary-500)] focus:border-[var(--primary-500)] focus:outline-none transition-all duration-200"
                    />
                    {searchQuery && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <button
                                onClick={() => setSearchQuery('')}
                                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-600/50 transition-colors"
                                aria-label="Clear search"
                            >
                                <ClearIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => handleNewConversation()}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
                    aria-label="New Chat"
                >
                    <NewChatIcon className="w-6 h-6" />
                </button>
                <button
                    onClick={handleSaveChat}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
                    aria-label="Save Chat"
                >
                    {isJustSaved ? <CheckIcon className="w-6 h-6 text-green-400" /> : <SaveIcon className="w-6 h-6" />}
                </button>
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
                    aria-label="Customize AI behavior"
                >
                    <SettingsIcon className="w-6 h-6" />
                </button>
            </div>
        </header>
        
        <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-900">
          <div className="max-w-4xl mx-auto">
            {filteredHistory.map((msg, index) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isLastMessage={!isLoading && index === filteredHistory.length - 1}
                onSuggestionClick={(suggestion) => handleSendMessage(suggestion)}
                onSpeak={handleSpeak}
                isSpeaking={speakingMessageId === msg.id}
                searchQuery={searchQuery}
                onClearChat={() => handleNewConversation({ source: 'clear' })}
                onRegenerate={handleRegenerateResponse}
              />
            ))}
            {error && (
              <div className="max-w-4xl mx-auto my-4 p-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg flex items-start gap-3">
                <ErrorIcon className="w-6 h-6 flex-shrink-0 text-red-400" />
                <div>
                  <p className="font-bold">An Error Occurred</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
          </div>
        </main>
        
        <footer className="border-t border-gray-700/50 flex-shrink-0">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} setError={setError} />
        </footer>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveSystemInstruction}
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