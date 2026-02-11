/**
 * Authentication service for managing JWT tokens and user state
 */

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'user_data'

export interface User {
  id: string
  email: string
  username: string
  full_name?: string
  is_active: boolean
  is_verified: boolean
  created_at: string
}

export interface LoginRequest {
  username: string // email
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
  full_name?: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

class AuthService {
  private token: string | null = null
  private user: User | null = null

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    this.token = localStorage.getItem(TOKEN_KEY)
    const userStr = localStorage.getItem(USER_KEY)
    this.user = userStr ? JSON.parse(userStr) : null
  }

  getToken(): string | null {
    return this.token
  }

  getUser(): User | null {
    return this.user
  }

  isAuthenticated(): boolean {
    return !!this.token
  }

  setAuth(response: AuthResponse) {
    this.token = response.access_token
    this.user = response.user
    localStorage.setItem(TOKEN_KEY, response.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(response.user))
  }

  clearAuth() {
    this.token = null
    this.user = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  getAuthHeader(): Record<string, string> {
    if (this.token) {
      return {
        Authorization: `Bearer ${this.token}`
      }
    }
    return {}
  }
}

export const authService = new AuthService()
