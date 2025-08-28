
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { ArrowLeft, Loader2, Bot, User, Paperclip, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAIChatResponse } from '../ai-actions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';

interface Message {
    role: 'user' | 'model';
    content: string;
    image?: string; // data URI for the image
}

export default function SupportPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'model',
            content: 'Namaste! Main aapka AI support agent hoon. Lucky Winner app se related aapki kya sahayata kar sakta hoon?'
        }
    ]);
    const [input, setInput] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Limit file size to 5MB
            if (file.size > 5 * 1024 * 1024) {
                toast({
                    title: 'File too large',
                    description: 'Please upload an image smaller than 5MB.',
                    variant: 'destructive',
                });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !image) || loading) return;

        const userMessage: Message = { role: 'user', content: input, image: image || undefined };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setImage(null);
        setLoading(true);

        try {
            // Simplified call: No longer sending history
            const res = await getAIChatResponse({ 
                query: input, 
                screenshotDataUri: image || undefined 
            });

            const modelMessage: Message = { role: 'model', content: res.response };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error',
                description: 'Sorry, I am unable to respond at the moment. Please try again later.',
                variant: 'destructive',
            });
             setMessages(prev => [...prev, {role: 'model', content: 'Sorry, I could not process your request.'}]);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push('/');
        }
    };

    return (
        <div className="bg-[#171d22] min-h-screen text-white flex flex-col">
            <Header />
            <main className="pt-16 flex-1 flex flex-col">
                <div className="container mx-auto px-4 py-6 flex-1 flex flex-col">
                     <div className="flex items-center gap-4 mb-6">
                        <Button variant="outline" size="icon" onClick={handleBack}>
                            <ArrowLeft />
                        </Button>
                        <h1 className="text-3xl font-bold text-primary">Support Center</h1>
                    </div>
                    <Card className="flex-1 flex flex-col bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bot />
                                <span>Lucky Winner Support Team</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                             {messages.map((message, index) => (
                                <div key={index} className={cn("flex items-end gap-2", message.role === 'user' ? "justify-end" : "justify-start")}>
                                    {message.role === 'model' && (
                                        <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                             <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={cn("rounded-lg px-4 py-2 max-w-[80%]", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                       {message.image && (
                                            <div className="mb-2">
                                                <Image src={message.image} alt="Screenshot" width={200} height={200} className="rounded-md" />
                                            </div>
                                       )}
                                       {message.content && <p className="text-sm">{message.content}</p>}
                                    </div>
                                     {message.role === 'user' && (
                                        <Avatar className="h-8 w-8">
                                             <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))}
                             {loading && (
                                <div className="flex items-end gap-2 justify-start">
                                    <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                        <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                                    </Avatar>
                                    <div className="rounded-lg px-4 py-2 bg-muted flex items-center">
                                       <Loader2 className="h-5 w-5 animate-spin"/>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </CardContent>
                        <CardFooter className="flex-col items-start gap-2 border-t border-gold/20 pt-4">
                            {image && (
                                <div className="relative p-2 border rounded-md border-primary/50">
                                    <Image src={image} alt="Preview" width={80} height={80} className="rounded-md" />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground"
                                        onClick={() => setImage(null)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
                                <Button type="button" size="icon" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                                    <Paperclip className="h-4 w-4" />
                                    <span className="sr-only">Attach Screenshot</span>
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*"
                                />
                                <Input
                                    id="message"
                                    placeholder="Type your message..."
                                    className="flex-1"
                                    autoComplete="off"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    disabled={loading}
                                />
                                <Button type="submit" size="icon" disabled={!input.trim() && !image || loading}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send-horizontal"><path d="m3 3 3 9-3 9 19-9Z"/><path d="M6 12h16"/></svg>}
                                    <span className="sr-only">Send</span>
                                </Button>
                            </form>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        </div>
    );
}
