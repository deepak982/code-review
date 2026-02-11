"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    full_name: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


# GitLab Configuration Schemas
class GitLabConfigCreate(BaseModel):
    config_name: Optional[str] = Field(None, description="Friendly name to identify this configuration (e.g., 'Personal GitLab', 'Work Account')")
    gitlab_url: str = Field(..., description="GitLab instance URL")
    access_token: str = Field(..., description="GitLab personal access token")
    project_id: Optional[str] = Field(None, description="GitLab project ID")


class GitLabConfigUpdate(BaseModel):
    config_name: Optional[str] = None
    gitlab_url: Optional[str] = None
    access_token: Optional[str] = None
    project_id: Optional[str] = None
    is_active: Optional[bool] = None


class GitLabConfigResponse(BaseModel):
    id: UUID
    config_name: Optional[str]
    gitlab_url: str
    project_id: Optional[str]
    is_active: bool
    validation_message: Optional[str] = None
    validation_error_code: Optional[str] = None
    gitlab_username: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Chat Schemas (existing)
class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    model: str
    timestamp: str


class ModelStatus(BaseModel):
    model_config = {"protected_namespaces": ()}

    status: str
    model_name: str
    last_updated: str
