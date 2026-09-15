import React, { useRef, useState } from 'react';
import { Bot, Check, ChevronDown, Loader2, Send, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AssistantAction, answerFarmQuestion, executeAssistantAction } from '../../services/farmAssistant';

interface Message {
  id: string;
  from: 'user' | 'assistant';
  text: string;
  action?: AssistantAction;
}

interface FarmAssistantProps {
  onRefresh: () => void;
}

const suggestions = ['Give me a farm summary', 'How many pigs do we have?', 'Which sows are pregnant?', 'How much feed do we have left?'];

interface AssistantPosition {
  left: number;
  top: number;
}

const getInitialPosition = (): AssistantPosition => {
  const saved = localStorage.getItem('pfms_assistant_position');
  if (saved) {
    try {
      return JSON.parse(saved) as AssistantPosition;
    } catch {
      localStorage.removeItem('pfms_assistant_position');
    }
  }

  return {
    left: Math.max(16, window.innerWidth - 190),
    top: Math.max(16, window.innerHeight - 145),
  };
};

export const FarmAssistant: React.FC<FarmAssistantProps> = ({ onRefresh }) => {
  const { role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [pendingAction, setPendingAction] = useState<AssistantAction | undefined>();
  const [assistantPosition, setAssistantPosition] = useState<AssistantPosition>(getInitialPosition);
  const assistantPositionRef = useRef(assistantPosition);
  const dragOffset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', from: 'assistant', text: 'I am connected to your farm records. Ask about livestock, breeding, health, feed, sales, expenses, or a current farm summary.' },
  ]);

  const ask = async (value: string) => {
    const question = value.trim();
    if (!question || isWorking) return;
    setInput('');
    setIsWorking(true);
    setMessages((current) => [...current, { id: `${Date.now()}-q`, from: 'user', text: question }]);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      const result = await answerFarmQuestion(question, role);
      setMessages((current) => [...current, { id: `${Date.now()}-a`, from: 'assistant', text: result.text, action: result.action }]);
      setPendingAction(result.action);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to answer that question right now.';
      setMessages((current) => [...current, { id: `${Date.now()}-e`, from: 'assistant', text: message }]);
    } finally {
      setIsWorking(false);
    }
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    setIsWorking(true);
    try {
      const result = await executeAssistantAction(pendingAction, role);
      setMessages((current) => [...current, { id: `${Date.now()}-r`, from: 'assistant', text: result.text }]);
      setPendingAction(undefined);
      if (result.refresh) onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to complete that action.';
      setMessages((current) => [...current, { id: `${Date.now()}-e`, from: 'assistant', text: message }]);
    } finally {
      setIsWorking(false);
    }
  };

  const handleAssistantPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    dragOffset.current = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    isDragging.current = true;
    hasDragged.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleAssistantPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const left = Math.min(Math.max(8, event.clientX - dragOffset.current.x), window.innerWidth - bounds.width - 8);
    const top = Math.min(Math.max(8, event.clientY - dragOffset.current.y), window.innerHeight - bounds.height - 8);
    if (Math.abs(left - assistantPosition.left) > 2 || Math.abs(top - assistantPosition.top) > 2) hasDragged.current = true;
    const nextPosition = { left, top };
    assistantPositionRef.current = nextPosition;
    setAssistantPosition(nextPosition);
  };

  const handleAssistantPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    isDragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    localStorage.setItem('pfms_assistant_position', JSON.stringify(assistantPositionRef.current));
  };

  const handleAssistantClick = () => {
    if (hasDragged.current) {
      hasDragged.current = false;
      return;
    }
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleAssistantClick}
        onPointerDown={handleAssistantPointerDown}
        onPointerMove={handleAssistantPointerMove}
        onPointerUp={handleAssistantPointerUp}
        style={{ left: assistantPosition.left, top: assistantPosition.top }}
        className="fixed z-40 flex h-14 w-14 touch-none cursor-grab items-center justify-center rounded-full bg-emerald-800 text-white shadow-xl shadow-emerald-900/20 transition hover:bg-emerald-900 active:cursor-grabbing lg:h-auto lg:w-auto lg:gap-2 lg:px-4 lg:py-3 lg:text-sm lg:font-semibold"
        aria-label="Open Farm Assistant"
        title="Drag to move or click to open Farm Assistant"
      >
        <Sparkles className="h-6 w-6 lg:h-4 lg:w-4" />
        <span className="hidden lg:inline">Farm Assistant</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/30" onMouseDown={(event) => event.target === event.currentTarget && setIsOpen(false)}>
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col border-l border-stone-200 bg-stone-50 shadow-2xl">
            <header className="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-800"><Bot className="h-5 w-5" /></div>
                <div><h2 className="font-bold text-stone-900">Farm Assistant</h2><p className="text-xs text-stone-500">Live records · {role}</p></div>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label="Close Farm Assistant"><X className="h-5 w-5" /></button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 ${message.from === 'user' ? 'rounded-br-md bg-emerald-800 text-white' : 'rounded-bl-md border border-stone-200 bg-white text-stone-700 shadow-sm'}`}>
                    {message.text}
                    {message.action && pendingAction === message.action && (
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-stone-200 pt-3">
                        <span className="text-xs font-semibold text-amber-700">Confirmation required</span>
                        <button type="button" onClick={confirmAction} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"><Check className="h-3.5 w-3.5" /> Confirm</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isWorking && <div className="flex items-center gap-2 text-xs text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Checking current farm records...</div>}
            </div>

            <div className="border-t border-stone-200 bg-white p-4">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => ask(suggestion)} className="shrink-0 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-emerald-300 hover:text-emerald-800">{suggestion}</button>)}
              </div>
              <form onSubmit={(event) => { event.preventDefault(); void ask(input); }} className="flex items-center gap-2 rounded-xl border border-stone-300 bg-stone-50 p-2 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about your farm..." className="min-w-0 flex-1 bg-transparent px-2 text-sm text-stone-900 outline-none placeholder:text-stone-400" />
                <button type="submit" disabled={!input.trim() || isWorking} className="rounded-lg bg-emerald-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send question"><Send className="h-4 w-4" /></button>
              </form>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-stone-400"><ChevronDown className="h-3 w-3" /> Actions are validated by the farm database before they are saved.</p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};