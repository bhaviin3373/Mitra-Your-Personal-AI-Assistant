import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { SendIcon, MicrophoneIcon, PaperClipIcon, ClearIcon } from './icons';

// Inform TypeScript about the SpeechRecognition API
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
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API is not supported in this browser.");
      return;
    }

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
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setInput(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };
    
    recognition.onend = () => {
      setIsRecording(false);
    };
    
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input, attachment]);

  const handleToggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSubmit = () => {
    const trimmedInput = input.trim();

    // Validate /imagine command has a prompt
    if (trimmedInput.toLowerCase().startsWith('/imagine')) {
        const prompt = trimmedInput.substring(8).trim();
        if (!prompt) {
            setError("Please provide a prompt for the image generation after '/imagine'.");
            return; // Stop submission
        }
    }

    // Validate that there is content to send or an attachment, and we are not loading.
    if ((!trimmedInput && !attachment) || isLoading) {
      return;
    }
    
    setError(null); // Clear any previous errors
    onSendMessage(trimmedInput, attachment?.url);
    setInput('');
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
    if (event.key === 'Escape' && attachment) {
      event.preventDefault();
      handleRemoveAttachment();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            setAttachment({ url: e.target?.result as string, name: file.name });
        };
        reader.readAsDataURL(file);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };
  
  const isSendDisabled = isLoading || (!input.trim() && !attachment);

  return (
    <div className="bg-gray-800/50 p-4 shadow-inner backdrop-blur-sm">
      <div className="relative max-w-4xl mx-auto">
        {attachment && (
            <div className="p-3 bg-gray-900/50 rounded-t-lg flex items-center justify-between border-b border-gray-700/60 animate-fade-in-scale transition-all">
                <div className="flex items-center gap-4 overflow-hidden">
                    <img src={attachment.url} alt="Attachment preview" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border-2 border-gray-600"/>
                    <div className="overflow-hidden">
                        <p className="text-base font-medium text-gray-100 truncate">{attachment.name}</p>
                        <p className="text-sm text-gray-400">Image will be sent with your message.</p>
                    </div>
                </div>
                <button
                    onClick={handleRemoveAttachment}
                    className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-white"
                    aria-label="Remove attachment"
                >
                    <ClearIcon className="w-5 h-5"/>
                </button>
            </div>
        )}
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                    setInput(e.target.value);
                    setError(null); // Clear error on new input
                }}
                onKeyDown={handleKeyDown}
                placeholder="Message Mitra... (e.g., Explain quantum computing, or use /imagine to create an image)"
                rows={1}
                className={`w-full bg-gray-700/80 text-gray-200 border border-gray-600 p-3 pr-28 pl-24 resize-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-[var(--primary-500)] focus:outline-none transition-all duration-200 ${attachment ? 'rounded-b-lg rounded-t-none' : 'rounded-lg'}`}
                disabled={isLoading}
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="p-2 rounded-full text-gray-400 hover:text-white disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
                    aria-label="Attach file"
                >
                    <PaperClipIcon className="w-5 h-5"/>
                </button>
                {recognitionRef.current && (
                    <button
                        onClick={handleToggleRecording}
                        disabled={isLoading}
                        className={`p-2 rounded-full text-gray-400 hover:text-white disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] ${isRecording ? 'text-red-500 animate-pulse' : ''}`}
                        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                    >
                        <MicrophoneIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSendDisabled}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-white bg-[var(--primary-600)] hover:bg-[var(--primary-500)] disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 transform disabled:scale-100 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-white"
              aria-label="Send message"
            >
              <SendIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};