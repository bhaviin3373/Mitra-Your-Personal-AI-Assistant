import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Conversation } from '../types';
import { NewChatIcon, DeleteIcon, ChatBubbleIcon, EditIcon } from './icons';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  isOpen,
  setIsOpen,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleStartEditing = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleCancelEditing = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleSaveEdit = () => {
    if (editingId && editingTitle.trim()) {
      onRenameConversation(editingId, editingTitle.trim());
    }
    handleCancelEditing();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEditing();
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      ></div>
      <aside
        className={`absolute top-0 left-0 h-full w-64 bg-gray-800 text-white flex flex-col z-40 transform transition-transform md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-700/50">
          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--primary-600)] text-white font-semibold rounded-md hover:bg-[var(--primary-500)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-[var(--primary-500)]"
          >
            <NewChatIcon className="w-5 h-5" />
            New Chat
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => editingId !== conv.id && onSelectConversation(conv.id)}
              className={`w-full text-left flex items-center justify-between gap-2 p-2 rounded-md text-sm transition-colors group ${
                conv.id === activeConversationId && !editingId
                  ? 'bg-gray-700'
                  : 'hover:bg-gray-700/50'
              } ${editingId !== conv.id ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-center gap-2 truncate flex-1">
                <ChatBubbleIcon className="w-5 h-5 flex-shrink-0 text-gray-400" />
                {editingId === conv.id ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={handleKeyDown}
                    className="bg-gray-600 text-white w-full rounded p-0.5 -m-0.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary-500)]"
                  />
                ) : (
                  <span className="truncate">{conv.title}</span>
                )}
              </div>
              {editingId !== conv.id && (
                <div className="flex items-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditing(conv);
                        }}
                        className="text-gray-400 hover:text-white p-1"
                        aria-label="Rename chat"
                    >
                        <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conv.id);
                        }}
                        className="text-gray-400 hover:text-red-400 p-1"
                        aria-label="Delete chat"
                    >
                        <DeleteIcon className="w-4 h-4" />
                    </button>
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700/50 text-xs text-gray-500">
            <p>&copy; 2024 Mitra AI</p>
        </div>
      </aside>
    </>
  );
};