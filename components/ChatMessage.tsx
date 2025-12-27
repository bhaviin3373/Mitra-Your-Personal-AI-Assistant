
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Role, Message } from '../types';
import { UserIcon, ModelIcon, ClipboardIcon, CheckIcon, SpeakerIcon, ClipboardDocumentListIcon, MagicWandIcon, DeleteIcon, ArrowPathIcon } from './icons';

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
  if (!highlight.trim()) return text;
  const safeHighlight = highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safeHighlight})`, 'gi');
  return text.replace(regex, `<mark class="bg-yellow-400/40 text-white font-bold rounded px-0.5">$1</mark>`);
};

const CodeBlock: React.FC<{ language: string; code: string; onCopy: (status: string) => void; }> = ({ language, code, onCopy }) => {
  const [copied, setCopied] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState(language);

  const highlightedCode = useMemo(() => {
    if (typeof hljs === 'undefined') return code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
    onCopy('Code copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-950 rounded-xl my-4 text-xs sm:text-sm border border-gray-800 overflow-hidden shadow-sm">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-900/50 text-gray-400 text-[10px] sm:text-xs border-b border-gray-800">
        <span className="font-mono uppercase tracking-wider">{detectedLanguage}</span>
        <button onClick={handleCopy} className="flex items-center gap-1.5 hover:text-white transition-colors">
          {copied ? <><CheckIcon className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400 font-medium">Copied!</span></> : <><ClipboardIcon className="w-3.5 h-3.5" /><span>Copy</span></>}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto custom-scrollbar">
        <code className={`language-${detectedLanguage} block`} dangerouslySetInnerHTML={{ __html: highlightedCode }} />
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
          return <CodeBlock key={index} language={codeBlockMatch[1] || ''} code={codeBlockMatch[2] || ''} onCopy={onCopy} />;
        } else {
          if (typeof marked !== 'undefined') {
            const highlightedPart = highlightText(part, searchQuery);
            const rawMarkup = marked.parse(highlightedPart, { gfm: true, breaks: true });
            return <div key={index} className="markdown-container" dangerouslySetInnerHTML={{ __html: rawMarkup }} />;
          }
          return <span key={index} dangerouslySetInnerHTML={{ __html: highlightText(part, searchQuery).replace(/\n/g, '<br />') }} />;
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
    return [...message.content.matchAll(codeBlockRegex)].map(match => match[1].trim());
  }, [message.content]);

  const handleCopyAllCode = () => {
    if (allCodeBlocks.length > 0) {
      navigator.clipboard.writeText(allCodeBlocks.join('\n\n/* --- Next Snippet --- */\n\n'));
      setAllCopied(true);
      setCopyStatus('All snippets copied');
      setTimeout(() => setAllCopied(false), 2000);
    }
  };

  const avatar = (
    <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 ${
      isUserMessage ? 'bg-gray-700' : 'bg-[var(--primary-600)]'
    }`}>
      {isUserMessage ? <UserIcon className="w-5 h-5 text-white" /> : <ModelIcon className="w-5 h-5 text-white" />}
    </div>
  );

  if (!isUserMessage && message.content === 'Generating image...') {
      return (
        <div className="flex items-start gap-3 sm:gap-4 my-6 animate-pulse">
          {avatar}
          <div className="max-w-[85%] sm:max-w-xl p-4 rounded-2xl bg-gray-800/50 border border-gray-700/50 rounded-tl-none">
            <div className="flex items-center gap-3">
              <MagicWandIcon className="w-5 h-5 text-[var(--primary-400)] animate-spin-slow" />
              <p className="text-gray-400 font-medium">Imagining something beautiful...</p>
            </div>
          </div>
        </div>
      )
  }

  if (!isUserMessage && isLastMessage && message.content.trim() === '' && !message.image) {
    return (
      <div className="flex items-start gap-3 sm:gap-4 my-6">
        {avatar}
        <div className="p-4 rounded-2xl bg-gray-800/80 border border-gray-700/50 rounded-tl-none flex gap-1.5 items-center">
            <div className="w-2 h-2 bg-[var(--primary-400)] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-[var(--primary-400)] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-[var(--primary-400)] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="group/msg mb-8 last:mb-20">
      <div aria-live="polite" role="status" className="sr-only">{copyStatus}</div>
      <div className={`flex items-start gap-3 sm:gap-4 ${isUserMessage ? 'flex-row-reverse' : ''}`}>
        <div className="hidden sm:block">
          {avatar}
        </div>
        <div
          className={`relative max-w-[88%] sm:max-w-[80%] md:max-w-[70%] lg:max-w-2xl px-4 py-3 sm:px-5 sm:py-4 rounded-2xl shadow-sm transition-all duration-300 ${
            isUserMessage
              ? 'bg-[var(--primary-600)] text-white rounded-tr-none ml-auto'
              : 'bg-gray-800/90 text-gray-100 rounded-tl-none border border-gray-700/50 mr-auto'
          }`}
        >
          {message.image && (
            <div className="relative mb-3 group/img overflow-hidden rounded-xl bg-black/20">
              <img src={message.image} alt="Media content" className="w-full h-auto max-h-[400px] object-contain transition-transform duration-500 hover:scale-105" />
               {!isUserMessage && (
                  <div className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-lg">
                      <MagicWandIcon className="w-4 h-4 text-[var(--primary-400)]"/>
                  </div>
              )}
            </div>
          )}
          {message.content && (
            <div className={`prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-transparent prose-pre:p-0 ${isUserMessage ? 'prose-headings:text-white prose-strong:text-white' : ''}`}>
               <FormattedContent content={message.content} searchQuery={searchQuery} onCopy={(status) => {
                 setCopyStatus('');
                 setTimeout(() => setCopyStatus(status), 50);
               }} />
            </div>
          )}
        </div>
      </div>

      {!isUserMessage && (message.content || allCodeBlocks.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 sm:ml-12 pl-1 sm:pl-0">
          <button
            onClick={() => onSpeak(message)}
            className={`p-2 rounded-lg transition-all ${isSpeaking ? 'bg-[var(--primary-500)]/20 text-[var(--primary-400)]' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'}`}
            aria-label={isSpeaking ? 'Stop speaking' : 'Speak message'}
          >
            <SpeakerIcon className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
          </button>

          {allCodeBlocks.length > 0 && (
            <button
              onClick={handleCopyAllCode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700 hover:text-white text-gray-400 rounded-lg transition-all text-[10px] sm:text-xs font-medium"
            >
              {allCopied ? <><CheckIcon className="w-3.5 h-3.5 text-green-400" /><span>All Copied!</span></> : <><ClipboardDocumentListIcon className="w-3.5 h-3.5" /><span>Copy Snippets</span></>}
            </button>
          )}

          {isLastMessage && message.content && (
            <div className="flex items-center gap-1">
              <button onClick={onRegenerate} className="p-2 text-gray-500 hover:bg-gray-800 hover:text-white rounded-lg transition-all" title="Regenerate">
                <ArrowPathIcon className="w-4 h-4" />
              </button>
              <button onClick={onClearChat} className="p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all" title="Reset Conversation">
                <DeleteIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          {isLastMessage && message.suggestions && message.suggestions.length > 0 && (
            <div className="w-full flex flex-wrap gap-2 mt-2">
              {message.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onSuggestionClick(suggestion)}
                  className="px-3 py-1.5 bg-gray-800 border border-gray-700/50 hover:bg-gray-700 hover:border-[var(--primary-500)] text-gray-300 text-xs rounded-full transition-all focus:ring-1 focus:ring-[var(--primary-500)]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
