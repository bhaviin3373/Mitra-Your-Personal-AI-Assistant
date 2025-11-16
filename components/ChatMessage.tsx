import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Role, Message } from '../types';
import { UserIcon, ModelIcon, ClipboardIcon, CheckIcon, SpeakerIcon, ClipboardDocumentListIcon, MagicWandIcon, DeleteIcon, ArrowPathIcon } from './icons';

// Inform TypeScript about global variables from external scripts
declare var hljs: any;
declare var marked: any;

interface ChatMessageProps {
  message: Message;
  isLastMessage: boolean;
  onSuggestionClick: (suggestion: string) => void;
  onSpeak: (message: Message) => void;
  isSpeaking: boolean;
  searchQuery: string;
  onClearChat: () => void;
  onRegenerate: () => void;
}

const highlightText = (text: string, highlight: string): string => {
  if (!highlight.trim()) {
    return text;
  }
  // Escape special characters in the highlight string for regex
  const safeHighlight = highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safeHighlight})`, 'gi');
  // A distinct but not jarring highlight style for search terms on a dark theme.
  return text.replace(regex, `<mark class="bg-yellow-400/50 text-white font-bold rounded px-1">$1</mark>`);
};

const CodeBlock: React.FC<{ language: string; code: string; onCopy: (status: string) => void; }> = ({ language, code, onCopy }) => {
  const [copied, setCopied] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState(language);

  const highlightedCode = useMemo(() => {
    if (typeof hljs === 'undefined') {
      return code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    if (language) {
      const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
      setDetectedLanguage(validLanguage);
      return hljs.highlight(code, { language: validLanguage, ignoreIllegals: true }).value;
    } else {
      const result = hljs.highlightAuto(code);
      setDetectedLanguage(result.language || 'plaintext');
      return result.value;
    }
  }, [code, language]);


  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    onCopy('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900 rounded-lg my-2 text-sm border border-gray-700 overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-950 text-gray-400 text-xs">
        <span>{detectedLanguage}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <CheckIcon className="w-4 h-4 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <ClipboardIcon className="w-4 h-4" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto hljs">
        <code className={`language-${detectedLanguage}`} dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    </div>
  );
};

const FormattedContent: React.FC<{ content: string; searchQuery: string; onCopy: (status: string) => void; }> = ({ content, searchQuery, onCopy }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        const codeBlockMatch = part.match(/```(\w*)\n([\s\S]*?)```/);
        if (codeBlockMatch) {
          const language = codeBlockMatch[1] || '';
          const code = codeBlockMatch[2] || '';
          // We don't highlight code to avoid complex conflicts with hljs
          return <CodeBlock key={index} language={language} code={code} onCopy={onCopy} />;
        } else {
          if (typeof marked !== 'undefined') {
            const highlightedPart = highlightText(part, searchQuery);
            const rawMarkup = marked.parse(highlightedPart, { gfm: true, breaks: true });
            return <div key={index} dangerouslySetInnerHTML={{ __html: rawMarkup }} />;
          }
          // Fallback if marked isn't loaded
          const highlightedPart = highlightText(part, searchQuery);
          return <span key={index} dangerouslySetInnerHTML={{ __html: highlightedPart.replace(/\n/g, '<br />') }} />;
        }
      })}
    </>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLastMessage, onSuggestionClick, onSpeak, isSpeaking, searchQuery, onClearChat, onRegenerate }) => {
  const isUserMessage = message.role === Role.USER;
  const [allCopied, setAllCopied] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');

  const allCodeBlocks = useMemo(() => {
    const codeBlockRegex = /```(?:\w*\n)?([\s\S]*?)```/g;
    const matches = [...message.content.matchAll(codeBlockRegex)];
    return matches.map(match => match[1].trim());
  }, [message.content]);

  const handleCopyAllCode = () => {
    if (allCodeBlocks.length > 0) {
      const separator = '\n\n/* --- Snippet copied from Mitra AI --- */\n\n';
      const combinedCode = allCodeBlocks.join(separator);
      navigator.clipboard.writeText(combinedCode);
      setAllCopied(true);
      setCopyStatus('All code copied to clipboard');
      setTimeout(() => setAllCopied(false), 2000);
    }
  };

  // Special loading indicator for image generation
  if (!isUserMessage && message.content === 'Generating image...') {
      return (
        <div className="flex items-start gap-4 my-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary-600)] flex items-center justify-center shadow-lg">
            <ModelIcon className="w-5 h-5 text-white" />
          </div>
          <div className="max-w-xl p-4 rounded-lg shadow-md bg-gray-800 border border-gray-700/80 rounded-bl-none">
            <div className="flex items-center gap-3">
              <MagicWandIcon className="w-5 h-5 text-[var(--primary-400)] animate-pulse" />
              <p className="text-gray-300">Generating image...</p>
            </div>
          </div>
        </div>
      )
  }

  // Typing indicator for empty, last, model message
  if (!isUserMessage && isLastMessage && message.content.trim() === '' && !message.image) {
    return (
      <div className="flex items-start gap-4 my-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary-600)] flex items-center justify-center shadow-lg">
          <ModelIcon className="w-5 h-5 text-white" />
        </div>
        <div className="max-w-xl p-4 rounded-lg shadow-md bg-gray-800 border border-gray-700/80 rounded-bl-none">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-[var(--primary-400)] rounded-full animate-refined-pulse"></div>
            <div className="w-2.5 h-2.5 bg-[var(--primary-400)] rounded-full animate-refined-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2.5 h-2.5 bg-[var(--primary-400)] rounded-full animate-refined-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div aria-live="polite" role="status" className="sr-only">{copyStatus}</div>
      <div className={`flex items-start gap-4 my-4 ${isUserMessage ? 'justify-end' : ''}`}>
        {!isUserMessage && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary-600)] flex items-center justify-center shadow-lg">
            <ModelIcon className="w-5 h-5 text-white" />
          </div>
        )}
        <div
          className={`max-w-xl p-4 rounded-lg shadow-md transition-colors ${
            isUserMessage
              ? 'bg-[var(--primary-600)] text-white rounded-br-none hover:bg-[var(--primary-500)]'
              : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700/80 hover:bg-gray-700/80'
          }`}
        >
          {message.image && (
            <div className="relative group mb-2">
              <img src={message.image} alt={isUserMessage ? "User attachment" : "AI generated image"} className="max-w-xs w-full rounded-lg" />
               {!isUserMessage && (
                  <div className="absolute top-2 left-2 p-1.5 bg-black/50 backdrop-blur-sm rounded-full">
                      <MagicWandIcon className="w-5 h-5 text-[var(--primary-400)]"/>
                  </div>
              )}
            </div>
          )}
          {message.content && (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-pre:my-2 prose-ul:my-2 prose-ol:my-2">
               <FormattedContent content={message.content} searchQuery={searchQuery} onCopy={(status) => {
                 setCopyStatus(''); // Clear first to ensure re-announcement
                 setTimeout(() => setCopyStatus(status), 50);
               }} />
            </div>
          )}
        </div>
        {isUserMessage && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center shadow-lg">
            <UserIcon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {!isUserMessage && (message.content || allCodeBlocks.length > 0) && (
        <div className={`max-w-xl -mt-2 flex items-center gap-2 flex-wrap ${isUserMessage ? 'justify-end mr-12' : 'ml-12'}`}>
          {message.content && (
            <button
              onClick={() => onSpeak(message)}
              className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
              aria-label={isSpeaking ? 'Stop speaking' : 'Read message aloud'}
              aria-pressed={isSpeaking}
            >
              <SpeakerIcon className={`w-5 h-5 ${isSpeaking ? 'text-[var(--primary-400)] animate-pulse' : ''}`} />
            </button>
          )}

          {allCodeBlocks.length > 0 && (
            <button
              onClick={handleCopyAllCode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700/80 hover:bg-gray-700/50 text-gray-300 text-sm rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
            >
              {allCopied ? (
                <>
                  <CheckIcon className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-xs">All Copied!</span>
                </>
              ) : (
                <>
                  <ClipboardDocumentListIcon className="w-4 h-4" />
                  <span className="text-xs">Copy all code</span>
                </>
              )}
            </button>
          )}

          {isLastMessage && message.suggestions && message.suggestions.length > 0 && (
            message.suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick(suggestion)}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700/80 hover:bg-gray-700/50 text-gray-300 text-sm rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
              >
                {suggestion}
              </button>
            ))
          )}

          {isLastMessage && message.content && (
            <>
              <button
                onClick={onRegenerate}
                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
                aria-label="Regenerate Response"
                title="Regenerate Response"
              >
                <ArrowPathIcon className="w-5 h-5" />
              </button>
              <button
                  onClick={onClearChat}
                  className="p-1.5 rounded-full text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  aria-label="Clear chat and start new conversation"
                  title="Clear Chat"
                >
                  <DeleteIcon className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};