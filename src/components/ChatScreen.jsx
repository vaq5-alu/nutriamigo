import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { sendMessageToCoach } from '../services/chatService';


export default function ChatScreen({ user, profileData, dailyLog, shoppingList, selectedDate, messages, setMessages, onAddShoppingItems, onAddLogEntry, onRemoveLogEntry, onRemoveShoppingItem, onClearShoppingList, onClearDailyLog }) {
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = (behavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        const t = setTimeout(() => scrollToBottom("auto"), 50);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        scrollToBottom("smooth");
    }, [messages]);

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: 'welcome',
                text: `Hola ${user?.username || ''}, soy tu Coach Nutricional. ¿Qué tal vas hoy?`,
                sender: 'ai'
            }]);
        }
    }, [user]);

    const handleClear = () => {
        if (window.confirm("¿Borrar historial?")) {
            setMessages([{
                id: 'welcome',
                text: `Hola ${user?.username || ''}, soy tu Coach Nutricional. ¿Qué tal vas hoy?`,
                sender: 'ai'
            }]);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userText = input;
        const userMessage = { id: Date.now(), text: userText, sender: 'user' };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            const context = {
                profile: profileData,
                dailyLog: dailyLog,
                shoppingList: shoppingList,
                chatHistory: messages.slice(-5), // Pass last 5 messages for context
                viewDate: selectedDate // Date currently being viewed
            };

            const response = await sendMessageToCoach(userText, context);

            if (response.type === 'action' || response.text) {
                if (response.text) {
                    const textMsg = { id: Date.now() + 1, text: response.text, sender: 'ai' };
                    setMessages(prev => [...prev, textMsg]);
                }

                // 2. Execute Actions
                if (response.type === 'action') {
                    const actions = response.data;
                    let feedbackMsg = "";

                    for (const action of actions) {
                        if (action.action === 'add_shopping' && action.items) {
                            onAddShoppingItems(action.items);
                            feedbackMsg += `Añadido a lista: ${action.items.join(', ')}. `;
                        }
                        else if (action.action === 'add_log') {
                            const entry = {
                                name: action.item || "Comida Desconocida",
                                calories: action.calories || 0,
                                protein: action.protein || 0,
                                carbs: action.carbs || 0,
                                fat: action.fat || 0,
                                mealType: action.mealType || 'snack',
                                isTomorrow: action.isTomorrow || false
                            };
                            onAddLogEntry(entry);
                            feedbackMsg += `Registrado: ${action.item}${action.isTomorrow ? ' (para mañana)' : ''}. `;
                        }
                        else if (action.action === 'remove_log') {
                            if (onRemoveLogEntry) {
                                onRemoveLogEntry(action.item);
                                feedbackMsg += `Eliminado del diario: ${action.item}. `;
                            }
                        }
                        else if (action.action === 'remove_shopping') {
                            if (onRemoveShoppingItem) {
                                onRemoveShoppingItem(action.item);
                                feedbackMsg += `Eliminado de lista: ${action.item}. `;
                            }
                        }
                        else if (action.action === 'clear_shopping') {
                            if (onClearShoppingList) {
                                onClearShoppingList();
                                feedbackMsg += `Lista de la compra vaciada. `;
                            }
                        }
                        else if (action.action === 'clear_log') {
                            if (onClearDailyLog) {
                                onClearDailyLog();
                                feedbackMsg += `Diario de hoy vaciado. `;
                            }
                        }
                    }

                    if (feedbackMsg) {
                        const actionMsg = { id: Date.now() + 2, text: `✅ Hecho: ${feedbackMsg}`, sender: 'ai' };
                        setMessages(prev => [...prev, actionMsg]);
                    }
                }
            }

        } catch (error) {
            console.error("Chat Error:", error);
            let errorText = "Lo siento, tuve un corte de conexión con el servidor. ¿Me lo puedes repetir?";
            
            if (error?.message?.includes("429") || error?.message?.toLowerCase().includes("quota")) {
                errorText = "¡Uy! Parece que tu clave de Google Gemini ha agotado su saldo o de peticiones límite (Quota Exceeded). 🥲 Revisa tu cuenta de Google Cloud.";
            }

            const errorMsg = { id: Date.now() + 1, text: errorText, sender: 'ai', isError: true };
            setMessages(prev => [...prev, errorMsg]);
            // saveChatMessage(user.id, errorMsg);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-[75vh] md:h-[calc(100vh-180px)] bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100/50">
            {/* Header */}
            <div className="bg-emerald-600 p-6 flex items-center justify-between text-white shadow-lg z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shadow-inner backdrop-blur-sm">
                        🤖
                    </div>
                    <div>
                        <h2 className="font-bold text-lg tracking-tight">NutriCoach IA</h2>
                        <p className="text-[10px] text-emerald-100 uppercase tracking-widest font-bold flex items-center gap-1.5 mt-0.5">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                            Conociendo tu dieta
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleClear}
                    className="p-3 hover:bg-emerald-700/50 rounded-2xl transition-all text-emerald-100 hover:text-white backdrop-blur-sm"
                    title="Limpiar Chat"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#fafbfb]">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div
                            className={`max-w-[85%] p-4 rounded-3xl text-[15px] leading-relaxed shadow-sm ${msg.sender === 'user'
                                ? 'bg-emerald-600 text-white rounded-br-none shadow-emerald-200'
                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none shadow-gray-100'
                                }`}
                        >
                            {msg.sender === 'ai' ? (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-3 space-y-1 opacity-95" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-3 space-y-1 opacity-95" {...props} />,
                                        li: ({ node, ...props }) => <li className="my-1" {...props} />,
                                        p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="font-bold text-emerald-950" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="font-bold text-lg mt-4 mb-2 text-emerald-900 border-l-4 border-emerald-500 pl-3" {...props} />,
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown>
                            ) : (
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            )}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-white p-4 rounded-3xl rounded-bl-none shadow-sm border border-gray-100 flex gap-1.5 items-center">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-150"></span>
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-300"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-50 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                <form onSubmit={handleSend} className="max-w-3xl mx-auto flex items-center gap-3 bg-gray-50 p-1.5 pl-5 rounded-full border border-gray-200 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pregunta lo que quieras..."
                        className="flex-1 py-2.5 bg-transparent border-none focus:outline-none focus:ring-0 text-[16px] text-gray-800 placeholder-gray-400"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 disabled:grayscale transition-all shadow-lg shadow-emerald-200 active:scale-90"
                    >
                        <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
