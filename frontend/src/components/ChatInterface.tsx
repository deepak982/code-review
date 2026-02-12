import { useState, useEffect, useRef } from "react"
import { Send, Bot, User, AlertCircle, Copy, RefreshCw } from "lucide-react"
import "@uiw/react-markdown-preview/markdown.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "@/services/api"
import type { Message, ModelStatus } from "@/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import SlashCommandMenu from "./SlashCommandMenu"
import MarkdownPreview from "@uiw/react-markdown-preview"

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkModelStatus()
    const interval = setInterval(checkModelStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const checkModelStatus = async () => {
    try {
      const status = await api.getModelStatus()
      setModelStatus(status)
      setError(null)
    } catch (err) {
      setError("Failed to connect to model")
      setModelStatus(null)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInput(value)

    // Show slash menu when "/" is typed at the start
    if (value === "/") {
      setShowSlashMenu(true)
    } else {
      setShowSlashMenu(false)
    }
  }

  const handleSlashCommandSelect = (command: { id: string; label: string }) => {
    setShowSlashMenu(false)
    setInput(`/${command.id}`)
    inputRef.current?.focus()
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setShowSlashMenu(false)
    setIsLoading(true)
    setError(null)

    try {
      // Check if it's a slash command
      if (userMessage.content.startsWith("/")) {
        const response = await api.sendSlashCommand({ command: userMessage.content })

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.response,
          timestamp: new Date(response.timestamp),
        }

        setMessages((prev) => [...prev, assistantMessage])
      } else {
        // Regular chat message
        const response = await api.sendMessage({ message: userMessage.content })

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.response,
          timestamp: new Date(response.timestamp),
        }

        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (err) {
      setError("Failed to get response from model")
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success("Message copied to clipboard")
  }

  const handleRegenerateResponse = async (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1) return

    const userMessage = messages[messageIndex - 1]
    if (!userMessage || userMessage.role !== "user") return

    const newMessages = messages.slice(0, messageIndex)
    setMessages(newMessages)
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.sendMessage({ message: userMessage.content })
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.response,
        timestamp: new Date(response.timestamp),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError("Failed to regenerate response")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4">
      <Card className="flex h-full max-h-[900px] w-full max-w-4xl flex-col shadow-lg border-slate-200 overflow-hidden">
        <CardHeader className="border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900">AI Assistant</CardTitle>
                {modelStatus && (
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {modelStatus.model_name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {modelStatus ? (
                <Badge
                  variant="secondary"
                  className={
                    modelStatus.status === "active"
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 font-medium"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                  }
                >
                  <div className={`mr-1.5 h-1.5 w-1.5 rounded-full ${modelStatus.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                  {modelStatus.status === "active" ? "Active" : "Inactive"}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Offline
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col overflow-hidden p-0 bg-gradient-to-b from-white to-slate-50/30">
          <ScrollArea ref={scrollRef} className="flex-1 p-6">
            <div className="space-y-6 max-w-3xl mx-auto">
              {messages.length === 0 && (
                <div className="flex h-full min-h-[400px] items-center justify-center text-center">
                  <div className="space-y-4">
                    <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-sm border border-blue-200/50">
                      <Bot className="h-10 w-10 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        Welcome! How can I assist you?
                      </h3>
                      <p className="text-sm text-slate-600 max-w-md">
                        I'm here to help answer your questions and provide information.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInput("What can you help me with?")}
                        className="text-xs border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                      >
                        💡 What can you help me with?
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInput("Tell me about your capabilities")}
                        className="text-xs border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                      >
                        🚀 Your capabilities
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex gap-3 items-start group ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <Avatar className="h-9 w-9 shrink-0 shadow-sm">
                    <AvatarFallback
                      className={
                        message.role === "user"
                          ? "bg-gradient-to-br from-slate-700 to-slate-900 text-white"
                          : "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 border border-blue-200/50"
                      }
                    >
                      {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>

                  <div className={`flex flex-col gap-2 max-w-[75%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        message.role === "user"
                          ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md"
                          : "bg-white text-slate-900 border border-slate-200 shadow-sm"
                      }`}
                    >
                      {message.role === "user" ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content}
                        </p>
                      ) : (
                        <div className="text-sm leading-relaxed w-full">
                          <MarkdownPreview
                            source={message.content}
                            style={{
                              backgroundColor: 'transparent',
                              color: '#0f172a',
                              fontSize: '0.875rem',
                              lineHeight: '1.625',
                              width: '100%',
                              maxWidth: '100%',
                              padding: 0,
                              wordBreak: 'break-word',
                            }}
                            wrapperElement={{
                              "data-color-mode": "light"
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 px-1">
                      <p className={`text-xs text-slate-500`}>
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>

                      {message.role === "assistant" && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-slate-100 rounded-md"
                            onClick={() => handleCopyMessage(message.content)}
                          >
                            <Copy className="h-3 w-3 text-slate-500" />
                          </Button>
                          {index === messages.length - 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-slate-100 rounded-md"
                              onClick={() => handleRegenerateResponse(message.id)}
                            >
                              <RefreshCw className="h-3 w-3 text-slate-500" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 items-start">
                  <Avatar className="h-9 w-9 shrink-0 shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 border border-blue-200/50">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-4 py-2.5">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {error && (
            <div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
              <div className="flex items-center gap-2 max-w-3xl mx-auto">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 bg-white p-4">
            <div className="relative flex gap-3 max-w-3xl mx-auto">
              <div className="relative flex-1">
                <SlashCommandMenu
                  isOpen={showSlashMenu}
                  onSelect={handleSlashCommandSelect}
                />
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message or '/' for commands..."
                  disabled={isLoading || modelStatus?.status !== "active"}
                  className="flex-1 h-12 border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || modelStatus?.status !== "active"}
                size="icon"
                className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
