
import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Conversation } from '../types';
import { NewChatIcon, DeleteIcon, ChatBubbleIcon, EditIcon, ClearIcon } from './icons';

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
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      ></div>

      {/* Sidebar Content */}
      <aside
        className={`fixed md:relative top-0 left-0 h-full w-72 bg-gray-900 border-r border-gray-800 text-white flex flex-col z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-800/50">
          <button
            onClick={onNewConversation}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--primary-600)] text-white font-semibold rounded-lg hover:bg-[var(--primary-500)] transition-all shadow-lg shadow-cyan-900/20 active:scale-95"
          >
            <NewChatIcon className="w-5 h-5" />
            <span>New Chat</span>
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden ml-2 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <ClearIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1 custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="text-center py-10 px-4">
               <p className="text-gray-500 text-sm">No conversations yet.</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => editingId !== conv.id && onSelectConversation(conv.id)}
                className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 ${
                  conv.id === activeConversationId && !editingId
                    ? 'bg-gray-800 text-white ring-1 ring-gray-700 shadow-sm'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                } ${editingId !== conv.id ? 'cursor-pointer' : ''}`}
              >
                <ChatBubbleIcon className={`w-5 h-5 flex-shrink-0 ${conv.id === activeConversationId ? 'text-[var(--primary-400)]' : 'text-gray-500'}`} />
                
                <div className="flex-1 truncate pr-12">
                  {editingId === conv.id ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={handleSaveEdit}
                      onKeyDown={handleKeyDown}
                      className="bg-gray-700 text-white w-full rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate font-medium">{conv.title}</span>
                  )}
                </div>

                {editingId !== conv.id && (
                  <div className="absolute right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-inherit pl-2">
                      <button
                          onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditing(conv);
                          }}
                          className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
                          aria-label="Rename chat"
                      >
                          <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                          onClick={(e) => {
                              e.stopPropagation();
                              onDeleteConversation(conv.id);
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          aria-label="Delete chat"
                      >
                          <DeleteIcon className="w-4 h-4" />
                      </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-800/50 flex items-center justify-between text-xs text-gray-500">
            <span className="font-medium tracking-tight">Mitra AI Assistant</span>
            <span className="opacity-60">v1.2.0</span>
        </div>
      </aside>
    </>
  );
};
