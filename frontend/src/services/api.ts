import type { ChatRequest, ChatResponse, ModelStatus } from "@/types"
import { authService, type LoginRequest, type RegisterRequest, type AuthResponse, type User } from "./auth"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

export interface GitLabConfig {
  id: string
  config_name?: string
  gitlab_url: string
  project_id?: string
  is_active: boolean
  validation_message?: string
  validation_error_code?: string
  gitlab_username?: string
  created_at: string
  updated_at: string
}

export interface GitLabConfigCreate {
  config_name?: string
  gitlab_url: string
  access_token: string
  project_id?: string
}

/**
 * API service for FastAPI backend communication
 */
export const api = {
  // Auth endpoints
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Registration failed")
    }

    return response.json()
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    const formData = new URLSearchParams()
    formData.append("username", data.username)
    formData.append("password", data.password)

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Login failed")
    }

    return response.json()
  },

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        ...authService.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch user")
    }

    return response.json()
  },

  // GitLab configuration endpoints
  async getGitLabConfigs(): Promise<GitLabConfig[]> {
    const response = await fetch(`${API_BASE_URL}/api/gitlab/configs`, {
      headers: {
        ...authService.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch GitLab configs")
    }

    return response.json()
  },

  async createGitLabConfig(data: GitLabConfigCreate): Promise<GitLabConfig> {
    const response = await fetch(`${API_BASE_URL}/api/gitlab/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authService.getAuthHeader(),
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to create GitLab config")
    }

    return response.json()
  },

  async updateGitLabConfig(configId: string, data: GitLabConfigCreate): Promise<GitLabConfig> {
    const response = await fetch(`${API_BASE_URL}/api/gitlab/config/${configId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authService.getAuthHeader(),
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to update GitLab config")
    }

    return response.json()
  },

  async deleteGitLabConfig(configId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/gitlab/config/${configId}`, {
      method: "DELETE",
      headers: {
        ...authService.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error("Failed to delete GitLab config")
    }
  },

  // Chat endpoints
  async getModelStatus(): Promise<ModelStatus> {
    const response = await fetch(`${API_BASE_URL}/api/status`)
    if (!response.ok) {
      throw new Error("Failed to fetch model status")
    }
    return response.json()
  },

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authService.getAuthHeader(),
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to send message")
    }

    return response.json()
  },

  async sendSlashCommand(request: { command: string }): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/api/slash-command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authService.getAuthHeader(),
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to execute command")
    }

    return response.json()
  },
}
