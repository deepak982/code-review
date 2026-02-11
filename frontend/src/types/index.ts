export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export interface ModelStatus {
  status: "active" | "inactive"
  model_name: string
  last_updated: string
}

export interface ChatRequest {
  message: string
}

export interface ChatResponse {
  response: string
  model: string
  timestamp: string
}
