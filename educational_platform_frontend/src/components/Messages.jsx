// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle,
  Search,
  Plus,
  Phone,
  Video,
  MoreHorizontal,
  Send,
  Paperclip,
  CheckCircle2,
  ArrowLeft,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import messageService, { emitMessagesChanged } from '@/services/messageService';
import connectionService from '@/services/connectionService';
import UserAvatar from '@/components/ui/UserAvatar';
import ClickableUser from '@/components/ui/ClickableUser';
import { useProfileNavigationOptional } from '@/contexts/ProfileNavigationContext';
import { PRESENCE_STATUS } from '@/lib/presence';

const THREAD_AVATAR_FALLBACK =
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150';
const GROUP_AVATAR_FALLBACK =
  'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=150';

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
  return `${Math.floor(diffInSeconds / 2592000)}mo`;
}

function formatMessageTime(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Messages() {
  const { user } = useAuth();
  const profileNav = useProfileNavigationOptional();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [networkUsers, setNetworkUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!showNewChat) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setShowNewChat(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [showNewChat]);

  const fetchThreads = useCallback(async () => {
    if (!user?.id) return;
    setThreadsLoading(true);
    setError('');
    try {
      const { threads: list } = await messageService.getUserThreads({ limit: 50 });
      setThreads(list || []);
      emitMessagesChanged();
    } catch (err) {
      console.error('Error fetching threads:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch conversations');
      setThreads([]);
    } finally {
      setThreadsLoading(false);
    }
  }, [user?.id]);

  const fetchMessages = useCallback(
    async (threadId, { silent = false } = {}) => {
      if (!threadId || !user?.id) return;
      if (!silent) {
        setMessagesLoading(true);
        setError('');
      }
      try {
        const { messages: list } = await messageService.getThreadMessages(threadId, { limit: 100 });
        setMessages(list || []);
        const me = String(user.id);
        const clearUnread = (t) => ({
          ...t,
          participants: (t.participants || []).map((p) =>
            String(p.user_id) === me ? { ...p, unread_count: 0 } : p,
          ),
        });
        setThreads((prev) => prev.map((t) => (t.id === threadId ? clearUnread(t) : t)));
        setSelectedThread((st) => (st && st.id === threadId ? clearUnread(st) : st));
        emitMessagesChanged();
      } catch (err) {
        console.error('Error fetching messages:', err);
        if (!silent) {
          setError(err.response?.data?.message || err.message || 'Failed to fetch messages');
          setMessages([]);
        }
      } finally {
        if (!silent) setMessagesLoading(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    void fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { users } = await connectionService.getUserNetwork({ page: 1, limit: 50 });
        if (!cancelled) setNetworkUsers(users || []);
      } catch {
        if (!cancelled) setNetworkUsers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const uid = sessionStorage.getItem('prefill_message_user_id');
    if (!uid) return;
    sessionStorage.removeItem('prefill_message_user_id');
    void (async () => {
      try {
        const thread = await messageService.getOrCreateDirectThread(uid);
        setThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
        setSelectedThread(thread);
        emitMessagesChanged();
      } catch (err) {
        console.error('Open thread from prefill:', err);
        setError(err.response?.data?.message || err.message || 'Could not open chat');
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!selectedThread?.id) {
      setMessages([]);
      return;
    }
    void fetchMessages(selectedThread.id);
  }, [selectedThread?.id, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    const tid = selectedThread?.id;
    if (!tid) return undefined;
    pollRef.current = setInterval(() => {
      void fetchMessages(tid, { silent: true });
      void fetchThreads();
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [selectedThread?.id, fetchMessages, fetchThreads]);

  const getOtherParticipant = (thread) => {
    if (!thread || thread.thread_type !== 'direct') return null;
    const uid = user?.id != null ? String(user.id) : '';
    const p = thread.participants?.find((x) => String(x.user_id) !== uid);
    return p?.user || null;
  };

  const handleCreateNewChat = async () => {
    if (!selectedUserId.trim()) return;
    setError('');
    try {
      const newThread = await messageService.getOrCreateDirectThread(selectedUserId.trim());
      setThreads((prev) => [newThread, ...prev.filter((t) => t.id !== newThread.id)]);
      setSelectedThread(newThread);
      setShowNewChat(false);
      setSelectedUserId('');
      emitMessagesChanged();
    } catch (err) {
      console.error('Error creating chat:', err);
      setError(err.response?.data?.message || err.message || 'Failed to start chat');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedThread || (!newMessage.trim() && !selectedFile)) return;
    const other = getOtherParticipant(selectedThread);
    const recipientId = other?.id || selectedThread.participants?.find((p) => String(p.user_id) !== String(user?.id))?.user_id;
    const messageData = {
      message: newMessage.trim(),
      message_type: selectedFile ? getFileType(selectedFile) : 'text',
      media: selectedFile || undefined,
      recipient_id: recipientId ? String(recipientId) : undefined,
    };
    setError('');
    try {
      const sentMessage = await messageService.sendMessage(selectedThread.id, messageData);
      setMessages((prev) => [...prev, sentMessage]);
      setNewMessage('');
      setSelectedFile(null);
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === selectedThread.id
            ? { ...thread, last_message: sentMessage, last_message_at: sentMessage.created_at }
            : thread,
        ),
      );
      setSelectedThread((st) =>
        st && st.id === selectedThread.id
          ? { ...st, last_message: sentMessage, last_message_at: sentMessage.created_at }
          : st,
      );
      emitMessagesChanged();
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.message || err.message || 'Failed to send message');
    }
  };

  const getFileType = (file) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'file';
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredThreads = threads.filter((thread) => {
    const q = searchTerm.toLowerCase();
    if (thread.thread_type === 'direct') {
      const otherUser = getOtherParticipant(thread);
      return (otherUser?.name || '').toLowerCase().includes(q);
    }
    return (thread.name || '').toLowerCase().includes(q);
  });

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center p-6">
        <p className="text-muted-foreground">Please log in to use Messages.</p>
      </div>
    );
  }

  return (
    <div className="platform-messages-shell relative">
      {/* Threads Sidebar */}
      <div className={`platform-messages-panel w-full md:w-80 transition-all ${selectedThread ? 'hidden md:flex' : 'flex'}`}>
        <div className="border-b border-border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Messages</h2>
            <button
              type="button"
              onClick={() => setShowNewChat(true)}
              className="rounded-lg p-2 text-muted-foreground transition-colors duration-200 hover:bg-blue-50 hover:text-blue-600"
              aria-label="New chat"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <input
              type="search"
              placeholder="Search conversations…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-border py-2 pl-10 pr-4 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threadsLoading && threads.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchTerm ? (
                'No conversations found'
              ) : (
                <div>
                  <MessageCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="mt-1 text-xs">Use + to start a chat</p>
                </div>
              )}
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const otherUser = getOtherParticipant(thread);
              const isSelected = selectedThread?.id === thread.id;
              const unread =
                thread.participants?.find((p) => String(p.user_id) === String(user.id))?.unread_count ?? 0;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedThread(thread)}
                  className={`w-full border-b border-border p-4 text-left transition-colors duration-200 hover:bg-muted/50 ${
                    isSelected ? 'border-blue-200 bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <UserAvatar
                      src={
                        thread.thread_type === 'direct'
                          ? otherUser?.avatar_url || THREAD_AVATAR_FALLBACK
                          : thread.avatar_url || GROUP_AVATAR_FALLBACK
                      }
                      alt={thread.thread_type === 'direct' ? otherUser?.name : thread.name}
                      size="lg"
                      status={thread.thread_type === 'direct' ? PRESENCE_STATUS.ONLINE : null}
                      showStatus={thread.thread_type === 'direct'}
                      fallbackSrc={
                        thread.thread_type === 'direct' ? THREAD_AVATAR_FALLBACK : GROUP_AVATAR_FALLBACK
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="truncate text-sm font-semibold text-foreground">
                          {thread.thread_type === 'direct' ? otherUser?.name : thread.name}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {thread.last_message_at ? formatTimeAgo(thread.last_message_at) : ''}
                        </span>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {thread.last_message?.message || 'No messages yet'}
                      </p>
                      {thread.thread_type === 'group' ? (
                        <p className="text-xs text-muted-foreground">{thread.participants?.length || 0} participants</p>
                      ) : null}
                    </div>
                    {unread > 0 ? (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                        {unread}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Active Chat View */}
      <div className={`platform-messages-thread flex-1 flex-col ${selectedThread ? 'flex' : 'hidden md:flex'}`}>
        {selectedThread ? (
          <>
            <div className="border-b border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button 
                    type="button" 
                    onClick={() => setSelectedThread(null)} 
                    className="md:hidden mr-1 rounded-lg p-2 -ml-2 text-muted-foreground hover:bg-muted"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  {selectedThread.thread_type === 'direct' ? (
                    <ClickableUser
                      userId={getOtherParticipant(selectedThread)?.id}
                      name={getOtherParticipant(selectedThread)?.name}
                      avatarUrl={
                        getOtherParticipant(selectedThread)?.avatar_url || THREAD_AVATAR_FALLBACK
                      }
                      size="md"
                      showName
                      showStatus
                      status={PRESENCE_STATUS.ONLINE}
                    />
                  ) : (
                    <UserAvatar
                      src={selectedThread.avatar_url || GROUP_AVATAR_FALLBACK}
                      alt={selectedThread.name}
                      size="md"
                      showStatus={false}
                      fallbackSrc={GROUP_AVATAR_FALLBACK}
                    />
                  )}
                  {selectedThread.thread_type !== 'direct' ? (
                    <div>
                      <h3 className="font-semibold text-foreground">{selectedThread.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {`${selectedThread.participants?.length || 0} participants`}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Direct message</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-blue-50 hover:text-blue-600">
                    <Phone className="h-5 w-5" />
                  </button>
                  <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-blue-50 hover:text-blue-600">
                    <Video className="h-5 w-5" />
                  </button>
                  <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messagesLoading && messages.length === 0 ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No messages yet. Say hello!</div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = String(message.sender_id) === String(user.id);
                  return (
                    <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                        {!isOwnMessage ? (
                          <img
                            src={
                              message.sender?.avatar_url ||
                              'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150'
                            }
                            alt={message.sender?.name || ''}
                            className="mb-1 h-8 w-8 rounded-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                        <div
                          className={`rounded-lg p-3 ${
                            isOwnMessage ? 'bg-blue-600 text-white' : 'bg-muted text-foreground'
                          }`}
                        >
                          {message.message_type === 'image' && message.media_url ? (
                            <img src={message.media_url} alt="" className="mb-2 w-full rounded-lg" />
                          ) : null}
                          {message.message_type === 'file' && message.media_url ? (
                            <div className="mb-2 flex items-center space-x-2 rounded-lg bg-card/20 p-2">
                              <Paperclip className="h-4 w-4" />
                              <span className="text-sm">File attached</span>
                            </div>
                          ) : null}
                          <p className="text-sm">{message.message}</p>
                        </div>
                        <div className={`mt-1 flex items-center space-x-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs text-muted-foreground" title={formatMessageTime(message.created_at)}>
                            {formatTimeAgo(message.created_at)} · {formatMessageTime(message.created_at)}
                          </span>
                          {isOwnMessage ? <CheckCircle2 className="h-3 w-3 text-blue-600" /> : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border bg-card p-4">
              {error ? (
                <div className="mb-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>
              ) : null}
              {selectedFile ? (
                <div className="mb-2 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-2">
                  <div className="flex items-center space-x-2">
                    <Paperclip className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-700">{selectedFile.name}</span>
                  </div>
                  <button type="button" onClick={removeSelectedFile} className="text-blue-600 hover:text-blue-800">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                  aria-label="Attach file"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  placeholder="Type a message…"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  className="flex-1 rounded-lg border border-border p-2 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={!newMessage.trim() && !selectedFile}
                  className={`rounded-lg p-2 transition-colors duration-200 ${
                    newMessage.trim() || selectedFile
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'cursor-not-allowed bg-muted text-muted-foreground'
                  }`}
                  aria-label="Send"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageCircle className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold text-foreground">Select a conversation</h3>
              <p className="text-muted-foreground">Choose a chat from the sidebar</p>
            </div>
          </div>
        )}
      </div>

      {showNewChat ? (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setShowNewChat(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-card p-5 sm:rounded-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Start new chat</h3>
              <button type="button" onClick={() => setShowNewChat(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="user-select" className="mb-2 block text-sm font-medium text-foreground">
                  Connection or user ID
                </label>
                {networkUsers.length > 0 ? (
                  <select
                    id="user-select"
                    className="mb-2 w-full rounded-lg border border-border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  >
                    <option value="">Select someone…</option>
                    {networkUsers.map((urow) => (
                      <option key={urow.id} value={String(urow.id)}>
                        {[urow.first_name, urow.last_name].filter(Boolean).join(' ') || urow.email || urow.id}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  type="text"
                  placeholder="Or paste user UUID"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-lg border border-border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewChat(false)}
                  className="rounded-lg bg-muted px-4 py-2 text-foreground transition-colors hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateNewChat()}
                  disabled={!selectedUserId.trim()}
                  className={`rounded-lg px-4 py-2 transition-colors ${
                    selectedUserId.trim()
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'cursor-not-allowed bg-muted text-muted-foreground'
                  }`}
                >
                  Start chat
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
