
import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { SendIcon, MicrophoneIcon, PaperClipIcon, ClearIcon } from './icons';

interface IWindow extends Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}
declare const window: IWindow;

interface ChatInputProps {
  onSendMessage: (message: string, attachment?: string) => void;
  isLoading: boolean;
  setError: (error: string | null) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, setError }) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef('');
  inputRef.current = input;

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onstart = () => {
      finalTranscript = inputRef.current.trim() + (inputRef.current.trim() ? ' ' : '');
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      setInput(finalTranscript + interimTranscript);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input, attachment]);

  const handleToggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) recognitionRef.current.stop();
    else recognitionRef.current.start();
  };

  const handleSubmit = () => {
    const trimmedInput = input.trim();
    if (trimmedInput.toLowerCase().startsWith('/imagine')) {
        const prompt = trimmedInput.substring(8).trim();
        if (!prompt) {
            setError("Please provide a prompt for image generation.");
            return;
        }
    }
    if ((!trimmedInput && !attachment) || isLoading) return;
    
    setError(null);
    onSendMessage(trimmedInput, attachment?.url);
    setInput('');
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setAttachment({ url: e.target?.result as string, name: file.name });
        reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-3 sm:p-5 bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent">
      <div className="relative max-w-4xl mx-auto group">
        {attachment && (
            <div className="p-2 sm:p-3 bg-gray-800 rounded-t-2xl flex items-center justify-between border-x border-t border-gray-700 animate-fade-in-scale">
                <div className="flex items-center gap-3 overflow-hidden">
                    <img src={attachment.url} alt="Upload" className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover border-2 border-gray-700 shadow-md"/>
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-gray-100 truncate">{attachment.name}</p>
                        <p className="text-[10px] sm:text-xs text-gray-400">Attached image</p>
                    </div>
                </div>
                <button onClick={() => setAttachment(null)} className="p-2 text-gray-500 hover:text-white transition-colors" aria-label="Remove">
                    <ClearIcon className="w-5 h-5"/>
                </button>
            </div>
        )}
        <div className="relative shadow-2xl rounded-2xl overflow-hidden ring-1 ring-gray-800 group-focus-within:ring-[var(--primary-500)] transition-all">
            <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                placeholder="Message Mitra..."
                rows={1}
                className={`w-full bg-gray-800 text-gray-100 p-4 pr-14 pl-12 sm:pl-24 resize-none focus:outline-none transition-all ${attachment ? 'rounded-b-2xl' : 'rounded-2xl'}`}
                disabled={isLoading}
            />
            
            <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 flex items-center gap-0.5 sm:gap-1">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="p-2 text-gray-500 hover:text-white transition-colors">
                    <PaperClipIcon className="w-5 h-5"/>
                </button>
                {recognitionRef.current && (
                    <button onClick={handleToggleRecording} disabled={isLoading} className={`p-2 transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-500 hover:text-white'}`}>
                        <MicrophoneIcon className="w-5 h-5" />
                    </button>
                )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading || (!input.trim() && !attachment)}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl text-white bg-[var(--primary-600)] hover:bg-[var(--primary-500)] disabled:bg-gray-700 disabled:text-gray-500 transition-all shadow-lg active:scale-95"
            >
              <SendIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};
