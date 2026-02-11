# Code Review AI - Development Guide

This document provides comprehensive information about the project structure, architecture, and development guidelines for AI assistants and developers working with this codebase.

## Project Overview

A full-stack code review platform with GitLab integration, featuring:
- Real-time GitLab credential validation
- JWT-based authentication
- Encrypted token storage
- Multi-account GitLab configuration management
- AI-powered code review capabilities

**Tech Stack:**
- **Backend:** Python 3.10+, FastAPI, SQLAlchemy, PostgreSQL
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Infrastructure:** Docker Compose (PostgreSQL, Redis, Qdrant)

## Project Structure

```
code-review/
├── backend/                      # Python FastAPI backend
│   ├── migrations/              # Database migration scripts
│   │   └── add_config_name.sql # Migration: Add config_name column
│   ├── auth.py                  # JWT authentication & user management
│   ├── database.py              # SQLAlchemy database setup
│   ├── encryption.py            # Fernet encryption for tokens
│   ├── gitlab_validator.py      # GitLab API validation logic
│   ├── init-db.sql             # Initial database schema
│   ├── llm_service.py          # Main FastAPI application & routes
│   ├── models.py               # SQLAlchemy ORM models
│   ├── schemas.py              # Pydantic validation schemas
│   └── requirements.txt        # Python dependencies
│
├── frontend/                    # React TypeScript frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── Auth/          # Authentication components
│   │   │   │   ├── Login.tsx
│   │   │   │   └── Register.tsx
│   │   │   ├── Sidebar/       # Settings sidebar
│   │   │   │   └── GitLabConfigSidebar.tsx
│   │   │   ├── ui/            # Reusable UI components (shadcn/ui)
│   │   │   ├── ChatInterface.tsx
│   │   │   └── ChatLayout.tsx
│   │   ├── services/          # API clients & services
│   │   │   ├── api.ts         # Backend API client
│   │   │   └── auth.ts        # Authentication service
│   │   ├── types/             # TypeScript type definitions
│   │   │   └── index.ts
│   │   ├── lib/               # Utility functions
│   │   │   └── utils.ts       # Class name utilities
│   │   ├── App.tsx            # Main application component
│   │   └── main.tsx           # Application entry point
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml          # Database services configuration
├── .env.example               # Environment variables template
├── LICENSE                    # MIT License
└── README.md                  # Project documentation
```

## Backend Architecture

### Core Modules

#### 1. `llm_service.py` - Main Application
**Purpose:** FastAPI application with all API routes

**Key Components:**
- FastAPI app initialization with CORS middleware
- API endpoint definitions for auth, GitLab configs, and chat
- Ollama LLM integration using agno framework

**Route Structure:**
```python
# Authentication routes
POST   /api/auth/register   # User registration
POST   /api/auth/login      # User login (JWT token)
GET    /api/auth/me         # Get current user info

# GitLab configuration routes
POST   /api/gitlab/config        # Create GitLab config with validation
GET    /api/gitlab/configs       # List user's configs
GET    /api/gitlab/config/{id}   # Get specific config
PUT    /api/gitlab/config/{id}   # Update config with validation
DELETE /api/gitlab/config/{id}   # Delete config

# Chat routes
POST   /api/chat   # Send message to LLM
GET    /api/status # Check LLM status
```

**Important Patterns:**
- All routes use dependency injection: `Depends(get_current_active_user)`
- Async/await for I/O operations
- HTTPException for error responses with proper status codes
- Response models defined in schemas.py

#### 2. `auth.py` - Authentication
**Purpose:** JWT token generation and user authentication

**Key Functions:**
```python
def get_password_hash(password: str) -> str
def verify_password(plain: str, hashed: str) -> bool
def create_access_token(data: dict, expires_delta: timedelta) -> str
def decode_access_token(token: str) -> TokenData
def get_current_user(token: str, db: Session) -> User
def get_current_active_user(current_user: User) -> User
```

**Security:**
- Bcrypt for password hashing
- JWT tokens with expiration
- OAuth2 password bearer scheme

#### 3. `encryption.py` - Token Encryption
**Purpose:** Encrypt/decrypt GitLab access tokens

**Key Functions:**
```python
def get_encryption_key() -> bytes
def encrypt_token(token: str) -> bytes
def decrypt_token(encrypted_token: bytes) -> str
```

**Security:**
- Fernet symmetric encryption
- Key stored in environment variable `ENCRYPTION_KEY`

#### 4. `gitlab_validator.py` - GitLab Validation
**Purpose:** Validate GitLab credentials by calling GitLab API

**Key Components:**
```python
class GitLabValidationResult(BaseModel):
    is_valid: bool
    error_message: Optional[str]
    error_code: Optional[str]
    gitlab_username: Optional[str]

async def validate_gitlab_credentials(
    gitlab_url: str,
    access_token: str,
    timeout: int = 10
) -> GitLabValidationResult
```

**Validation Flow:**
1. Validates URL format using Pydantic
2. Calls GitLab API `/api/v4/user` endpoint
3. Returns validation result with error codes
4. Handles timeouts, network errors, and API errors

**Error Codes:**
- `invalid_url` - Malformed URL
- `invalid_token` - 401 from GitLab
- `insufficient_permissions` - 403 from GitLab
- `not_found` - 404 from GitLab
- `timeout` - Connection timeout
- `network_error` - Network issues
- `api_error` - Other API errors

#### 5. `models.py` - Database Models
**Purpose:** SQLAlchemy ORM models

**Models:**
```python
class User(Base):
    # User accounts with authentication
    id, email, username, password_hash, full_name
    is_active, is_verified, created_at, updated_at, last_login

class GitLabConfig(Base):
    # GitLab account configurations
    id, user_id, config_name, gitlab_url
    access_token_encrypted, project_id, is_active
    created_at, updated_at

class ChatSession(Base):
    # Chat conversation sessions
    id, user_id, title, created_at, updated_at

class ChatMessage(Base):
    # Individual chat messages
    id, session_id, role, content, message_metadata
    created_at
```

**Key Patterns:**
- UUID primary keys
- Timestamps with timezone
- Foreign key relationships with CASCADE delete
- Encrypted token storage (bytes type)

#### 6. `schemas.py` - Pydantic Schemas
**Purpose:** Request/response validation

**Schema Types:**
```python
# Authentication schemas
UserRegister, UserLogin, Token, UserResponse

# GitLab configuration schemas
GitLabConfigCreate    # POST request body
GitLabConfigUpdate    # PUT request body
GitLabConfigResponse  # API response

# Chat schemas
ChatRequest, ChatResponse, ModelStatus
```

**Important Fields:**
- `config_name` - Optional friendly name for GitLab configs
- `validation_message` - Computed field for validation feedback
- `gitlab_username` - Computed field from GitLab API
- All schemas use `from_attributes = True` for ORM compatibility

#### 7. `database.py` - Database Setup
**Purpose:** SQLAlchemy engine and session management

**Key Components:**
```python
SQLALCHEMY_DATABASE_URL  # From environment
engine                   # SQLAlchemy engine
SessionLocal            # Session factory
Base                    # Declarative base

def get_db():
    # Dependency for route handlers
    # Yields database session, ensures cleanup
```

## Frontend Architecture

### Core Structure

#### Component Organization
```
components/
├── Auth/              # Authentication pages
├── Sidebar/           # Settings and configuration
├── ui/                # Reusable UI primitives
├── ChatInterface.tsx  # Main chat interface
└── ChatLayout.tsx     # Layout wrapper
```

#### Services Layer
```
services/
├── api.ts    # Backend API client (fetch-based)
├── auth.ts   # Authentication state management
```

### Key Components

#### 1. `GitLabConfigSidebar.tsx` - Configuration Management
**Purpose:** Manage GitLab configurations with validation

**State Management:**
```typescript
configs: GitLabConfig[]           // List of configurations
isLoading: boolean               // Loading state
showAddForm: boolean             // Form visibility
newConfig: GitLabConfigCreate    // Form data
validationStatus: {              // Validation state
  isValidating: boolean
  message?: string
}
editingConfig: GitLabConfig | null  // Edit mode tracking
```

**Key Features:**
- Add/Edit/Delete GitLab configurations
- Real-time credential validation with spinner
- Success/warning toast notifications
- Status badges (✓ Valid / ⚠ Invalid)
- Edit mode with optional token field
- Configuration naming for easy identification

**Form Fields:**
- `config_name` - Optional friendly name
- `gitlab_url` - Required GitLab instance URL
- `access_token` - Required for new, optional for edit
- `project_id` - Optional project identifier

#### 2. `api.ts` - API Client
**Purpose:** Centralized API communication

**Key Patterns:**
```typescript
// Base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

// Consistent error handling
if (!response.ok) {
  const error = await response.json()
  throw new Error(error.detail || "Operation failed")
}

// Authentication header injection
headers: {
  "Content-Type": "application/json",
  ...authService.getAuthHeader()
}
```

**Interface Definitions:**
```typescript
interface GitLabConfig {
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
```

#### 3. `auth.ts` - Authentication Service
**Purpose:** Singleton service for auth state management

**Key Methods:**
```typescript
setAuth(response: AuthResponse): void  // Store token & user
clearAuth(): void                      // Logout
getAuthHeader(): Record<string, string> // Authorization header
getToken(): string | null
getUser(): User | null
```

**Storage:** Uses localStorage for persistence

## Development Guidelines

### Backend Development

#### Adding New API Endpoints

1. **Define Schema in `schemas.py`:**
```python
class NewFeatureCreate(BaseModel):
    field1: str = Field(..., description="Description")
    field2: Optional[int] = None

class NewFeatureResponse(BaseModel):
    id: UUID
    field1: str
    field2: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
```

2. **Add Route in `llm_service.py`:**
```python
@app.post("/api/features", response_model=NewFeatureResponse)
async def create_feature(
    data: NewFeatureCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new feature.

    Args:
        data: Feature creation data
        current_user: Authenticated user
        db: Database session

    Returns:
        NewFeatureResponse: Created feature

    Raises:
        HTTPException: If validation fails
    """
    # Implementation
    pass
```

3. **Use Proper HTTP Status Codes:**
- `200` - OK (GET, PUT successful)
- `201` - Created (POST successful)
- `204` - No Content (DELETE successful)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (no/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error (unexpected error)

#### Database Migrations

**Creating a Migration:**
1. Modify models in `models.py`
2. Create SQL file in `backend/migrations/`:
```sql
-- Migration: Add new_field to table_name
-- Date: YYYY-MM-DD
-- Description: Purpose of migration

ALTER TABLE table_name
ADD COLUMN IF NOT EXISTS new_field TYPE;

COMMENT ON COLUMN table_name.new_field IS 'Description';
```

3. Update `init-db.sql` for new installations
4. Run migration:
```bash
docker exec -i code-review-postgres psql -U postgres -d code_review < backend/migrations/migration_name.sql
```

### Frontend Development

#### Adding New Components

**Component Structure:**
```typescript
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { api } from "@/services/api"

interface ComponentProps {
  prop1: string
  prop2?: number
}

/**
 * Component description
 *
 * @param {ComponentProps} props - Component props
 * @returns JSX element
 */
export default function ComponentName({ prop1, prop2 }: ComponentProps) {
  const [state, setState] = useState<Type>(initialValue)

  const handleAction = async () => {
    try {
      // Implementation
      toast.success("Action successful")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed")
    }
  }

  return (
    // JSX
  )
}
```

#### State Management Patterns

**Loading States:**
```typescript
const [isLoading, setIsLoading] = useState(false)

const handleSubmit = async () => {
  setIsLoading(true)
  try {
    await api.someAction()
  } finally {
    setIsLoading(false)
  }
}
```

**Form State:**
```typescript
const [formData, setFormData] = useState({
  field1: "",
  field2: ""
})

<Input
  value={formData.field1}
  onChange={(e) => setFormData({ ...formData, field1: e.target.value })}
/>
```

**Async Operations:**
```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      const data = await api.getData()
      setData(data)
    } catch (error) {
      toast.error("Failed to load data")
    }
  }
  fetchData()
}, [])
```

#### Adding New API Endpoints

1. **Update `api.ts` interface:**
```typescript
export interface NewType {
  id: string
  field1: string
}
```

2. **Add API method:**
```typescript
async newAction(data: NewType): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}/api/endpoint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authService.getAuthHeader(),
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Action failed")
  }

  return response.json()
}
```

## Code Style Guidelines

### Backend (Python)

**Function Documentation:**
```python
def function_name(param1: str, param2: int = 0) -> ReturnType:
    """
    Brief description of function.

    Args:
        param1: Description of param1
        param2: Description of param2

    Returns:
        Description of return value

    Raises:
        ExceptionType: When this exception is raised
    """
    pass
```

**Class Documentation:**
```python
class ClassName(BaseModel):
    """
    Brief description of class.

    Attributes:
        field1: Description of field1
        field2: Description of field2
    """
    field1: str
    field2: Optional[int] = None
```

**Avoid:**
- Inline comments explaining obvious code
- Long functions (>50 lines)
- Global variables
- Hardcoded values (use environment variables)

### Frontend (TypeScript)

**JSDoc for Components:**
```typescript
/**
 * Component description
 *
 * @param {Props} props - Component props
 * @param {string} props.title - Title to display
 * @param {number} [props.count] - Optional count
 * @returns JSX element
 */
```

**JSDoc for Functions:**
```typescript
/**
 * Function description
 *
 * @param {string} input - Input parameter
 * @returns {Promise<Result>} Result of operation
 * @throws {Error} When validation fails
 */
async function functionName(input: string): Promise<Result> {
  // Implementation
}
```

**Type Definitions:**
```typescript
// Use interfaces for objects
interface UserData {
  id: string
  name: string
}

// Use type for unions/intersections
type Status = "active" | "inactive"
type Combined = TypeA & TypeB
```

## Testing Guidelines

### Backend Testing
```python
# Test file: test_feature.py
import pytest
from fastapi.testclient import TestClient
from llm_service import app

client = TestClient(app)

def test_endpoint():
    """Test endpoint behavior"""
    response = client.post("/api/endpoint", json={})
    assert response.status_code == 200
```

### Frontend Testing
```typescript
// Test file: Component.test.tsx
import { render, screen } from '@testing-library/react'
import Component from './Component'

test('renders component', () => {
  render(<Component />)
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})
```

## Common Patterns

### Error Handling

**Backend:**
```python
try:
    result = await some_operation()
except SpecificError as e:
    logger.error(f"Operation failed: {e}")
    raise HTTPException(status_code=400, detail=str(e))
```

**Frontend:**
```typescript
try {
  await api.someAction()
  toast.success("Success message")
} catch (error) {
  const message = error instanceof Error ? error.message : "Operation failed"
  toast.error(message)
}
```

### Validation

**Backend (Pydantic):**
```python
class Schema(BaseModel):
    email: EmailStr
    age: int = Field(..., ge=0, le=150)
    name: str = Field(..., min_length=1, max_length=100)
```

**Frontend:**
```typescript
if (!formData.email || !formData.password) {
  toast.error("Please fill in all required fields")
  return
}

if (formData.password.length < 8) {
  toast.error("Password must be at least 8 characters")
  return
}
```

## Security Considerations

### Password Storage
- **Never** store plain text passwords
- Use bcrypt with salt (handled by passlib)
- Minimum password length: 8 characters

### Token Security
- GitLab tokens encrypted with Fernet
- JWT tokens with expiration
- Tokens never logged or exposed in errors

### API Security
- All protected routes require JWT authentication
- CORS configured for allowed origins
- SQL injection prevented by SQLAlchemy ORM
- Input validation via Pydantic schemas

## Environment Configuration

### Required Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# JWT
JWT_SECRET=random-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Encryption
ENCRYPTION_KEY=fernet-key

# LLM
OLLAMA_MODEL=model-name
OLLAMA_BASE_URL=http://localhost:11434

# Backend
BACKEND_PORT=3000
BACKEND_HOST=0.0.0.0

# Frontend
VITE_API_URL=http://localhost:3000
```

### Generating Secure Keys
```bash
# JWT Secret
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Encryption Key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Deployment Checklist

- [ ] Update environment variables in `.env`
- [ ] Change default database passwords
- [ ] Generate secure JWT_SECRET and ENCRYPTION_KEY
- [ ] Run database migrations
- [ ] Configure CORS origins for production
- [ ] Set up SSL/TLS certificates
- [ ] Configure logging level
- [ ] Set DEBUG=false in production
- [ ] Set up backup strategy for database
- [ ] Configure monitoring and alerting

## Common Tasks

### Add New GitLab Validation Check
1. Update `gitlab_validator.py` with new validation logic
2. Add new error code to `GitLabValidationResult`
3. Update frontend to handle new error code
4. Test with various scenarios

### Add New Database Table
1. Create model in `models.py`
2. Create schema in `schemas.py`
3. Add to `init-db.sql`
4. Create migration SQL file
5. Run migration on existing databases

### Add New UI Component
1. Create component in appropriate folder
2. Define TypeScript interfaces
3. Add JSDoc documentation
4. Import and use in parent component
5. Test in different states (loading, error, success)

## Resources

### Documentation Links
- FastAPI: https://fastapi.tiangolo.com/
- SQLAlchemy: https://docs.sqlalchemy.org/
- React: https://react.dev/
- TypeScript: https://www.typescriptlang.org/docs/
- Tailwind CSS: https://tailwindcss.com/docs

### Development Commands
```bash
# Backend
cd backend
source env/bin/activate
python llm_service.py

# Frontend
cd frontend
yarn dev

# Database
docker-compose up -d postgres
docker exec -it code-review-postgres psql -U postgres -d code_review

# Logs
docker logs code-review-postgres
```

---

**Last Updated:** 2026-02-11
**Version:** 1.0.0
