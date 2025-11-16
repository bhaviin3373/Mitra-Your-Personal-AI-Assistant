import React, { useState, useEffect } from 'react';
import { SettingsIcon } from './icons';
import { Theme } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newPrompt: string) => void;
  currentPrompt: string;
  selectedVoice: 'male' | 'female';
  onVoiceChange: (voice: 'male' | 'female') => void;
  themes: Theme[];
  activeTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const examplePrompts = [
    {
        name: 'Sarcastic Assistant',
        prompt: 'You are a sarcastic and witty AI assistant. You answer questions correctly, but with a heavy dose of dry humor and irony.'
    },
    {
        name: 'Expert Coder',
        prompt: 'You are an expert programmer with 20 years of experience. Provide detailed, production-quality code examples. Assume the user is a professional developer. Be concise and direct.'
    },
    {
        name: 'ELI5 (Explain Like I\'m 5)',
        prompt: 'You are an AI that explains complex topics in a simple and easy-to-understand way, as if you were talking to a five-year-old. Use simple words and analogies.'
    },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentPrompt, selectedVoice, onVoiceChange, themes, activeTheme, onThemeChange }) => {
  const [prompt, setPrompt] = useState(currentPrompt);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave(prompt);
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out" 
        aria-modal="true" 
        role="dialog"
        onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl transform transition-all duration-300 ease-in-out m-4 animate-fade-in-scale max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-700/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-gray-400" />
            <h2 className="text-xl font-semibold text-white">Settings</h2>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-2">Customize AI Behavior</h3>
            <p className="text-gray-400 mt-1 mb-4 text-sm">
                Edit the system prompt below to change the AI's personality. Your changes will start a new conversation.
            </p>
            <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-300 mb-2">System Prompt</label>
            <textarea
                id="system-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={8}
                className="w-full bg-gray-900 text-gray-200 border border-gray-600 rounded-lg p-3 resize-y focus:ring-2 focus:ring-[var(--primary-500)] focus:outline-none transition-all duration-200"
                placeholder="e.g., You are a helpful AI assistant..."
            />

            <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Or, try an example:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {examplePrompts.map((ex) => (
                        <button 
                            key={ex.name}
                            onClick={() => setPrompt(ex.prompt)}
                            className="p-4 border border-gray-700 rounded-lg text-left hover:bg-gray-700/50 hover:border-[var(--primary-500)]/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
                        >
                            <p className="font-semibold text-white text-sm">{ex.name}</p>
                            <p className="text-gray-400 text-xs mt-1 leading-relaxed">{ex.prompt.substring(0, 80)}...</p>
                        </button>
                    ))}
                </div>
            </div>

            <hr className="my-6 border-gray-700/50" />
            
            <div>
                 <h3 id="voice-settings-label" className="text-lg font-semibold text-white mb-2">Voice Settings</h3>
                 <p className="text-gray-400 mt-1 mb-4 text-sm">
                    Choose the voice for reading messages aloud.
                </p>
                <div role="group" aria-labelledby="voice-settings-label" className="flex gap-4">
                    <button
                        onClick={() => onVoiceChange('female')}
                        aria-pressed={selectedVoice === 'female'}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-[var(--primary-500)] ${selectedVoice === 'female' ? 'bg-[var(--primary-600)] text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                        Female
                    </button>
                    <button
                        onClick={() => onVoiceChange('male')}
                        aria-pressed={selectedVoice === 'male'}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-[var(--primary-500)] ${selectedVoice === 'male' ? 'bg-[var(--primary-600)] text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                        Male
                    </button>
                </div>
            </div>

            <hr className="my-6 border-gray-700/50" />

            <div>
                 <h3 id="theme-color-label" className="text-lg font-semibold text-white mb-2">Theme Color</h3>
                 <p className="text-gray-400 mt-1 mb-4 text-sm">
                    Personalize the look and feel of the application.
                </p>
                <div role="group" aria-labelledby="theme-color-label" className="flex gap-4">
                    {themes.map(theme => (
                        <button
                            key={theme.name}
                            onClick={() => onThemeChange(theme)}
                            aria-pressed={activeTheme.name === theme.name}
                            className={`w-10 h-10 rounded-full transition-all focus:outline-none ${activeTheme.name === theme.name ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-white' : ''}`}
                            style={{ backgroundColor: theme.colors['--primary-500'] }}
                            aria-label={`Select ${theme.name} theme`}
                        >
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div className="bg-gray-700/50 px-6 py-4 flex justify-end gap-4 rounded-b-lg flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-transparent text-gray-300 rounded-md hover:bg-gray-700 transition-colors border border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[var(--primary-600)] text-white font-semibold rounded-md hover:bg-[var(--primary-500)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-[var(--primary-500)]"
          >
            Save and Restart
          </button>
        </div>
      </div>
    </div>
  );
};