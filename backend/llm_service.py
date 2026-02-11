"""
LLM Service - FastAPI backend with Authentication and GitLab Integration
"""

import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import List
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

# Import Ollama
from agno.models.ollama import Ollama
from agno.agent import Agent

# Import local modules
from database import get_db, engine, Base
from models import User, GitLabConfig
from schemas import (
    UserRegister, UserLogin, Token, UserResponse,
    GitLabConfigCreate, GitLabConfigUpdate, GitLabConfigResponse,
    ChatRequest, ChatResponse, ModelStatus
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_active_user
)
from gitlab_validator import validate_gitlab_credentials
from encryption import encrypt_token, decrypt_token

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Code Review AI Service",
    description="AI-powered code review with GitLab integration",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Ollama Agent ====================

def connect_ollama() -> Agent:
    """Connect to local Ollama model"""
    model_name = os.getenv("OLLAMA_MODEL", "llama3.2")
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model = Ollama(id=model_name, host=base_url)
    return Agent(model=ollama_model)


agent = connect_ollama()


# ==================== Authentication Endpoints ====================

@app.post("/api/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=hashed_password,
        full_name=user_data.full_name
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create access token
    access_token = create_access_token(
        data={"sub": str(new_user.id), "email": new_user.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }


@app.post("/api/auth/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login user and return JWT token"""
    # Find user by email (username field in OAuth2 form)
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user


# ==================== GitLab Configuration Endpoints ====================

@app.post("/api/gitlab/config", response_model=GitLabConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_gitlab_config(
    config_data: GitLabConfigCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create or update GitLab configuration for current user"""
    # Check if config already exists for this URL
    existing_config = db.query(GitLabConfig).filter(
        GitLabConfig.user_id == current_user.id,
        GitLabConfig.gitlab_url == config_data.gitlab_url
    ).first()

    if existing_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitLab configuration for this URL already exists"
        )

    # Validate GitLab credentials
    validation_result = await validate_gitlab_credentials(
        config_data.gitlab_url,
        config_data.access_token
    )

    # Encrypt the access token (even if invalid - user might fix URL later)
    encrypted_token = encrypt_token(config_data.access_token)

    # Create new configuration with validation status
    new_config = GitLabConfig(
        user_id=current_user.id,
        config_name=config_data.config_name,
        gitlab_url=config_data.gitlab_url,
        access_token_encrypted=encrypted_token,
        project_id=config_data.project_id,
        is_active=validation_result.is_valid  # Set based on validation
    )

    db.add(new_config)
    db.commit()
    db.refresh(new_config)

    # Build response with validation details (computed, not stored in DB)
    response_dict = {
        "id": str(new_config.id),
        "config_name": new_config.config_name,
        "gitlab_url": new_config.gitlab_url,
        "project_id": new_config.project_id,
        "is_active": new_config.is_active,
        "created_at": new_config.created_at,
        "updated_at": new_config.updated_at,
        "validation_message": validation_result.error_message or "Credentials validated successfully",
        "validation_error_code": validation_result.error_code,
        "gitlab_username": validation_result.gitlab_username
    }

    return response_dict


@app.get("/api/gitlab/configs", response_model=List[GitLabConfigResponse])
async def get_gitlab_configs(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all GitLab configurations for current user"""
    configs = db.query(GitLabConfig).filter(
        GitLabConfig.user_id == current_user.id
    ).all()
    return configs


@app.get("/api/gitlab/config/{config_id}", response_model=GitLabConfigResponse)
async def get_gitlab_config(
    config_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific GitLab configuration"""
    config = db.query(GitLabConfig).filter(
        GitLabConfig.id == config_id,
        GitLabConfig.user_id == current_user.id
    ).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="GitLab configuration not found"
        )

    return config


@app.put("/api/gitlab/config/{config_id}", response_model=GitLabConfigResponse)
async def update_gitlab_config(
    config_id: str,
    config_update: GitLabConfigUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update GitLab configuration"""
    config = db.query(GitLabConfig).filter(
        GitLabConfig.id == config_id,
        GitLabConfig.user_id == current_user.id
    ).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="GitLab configuration not found"
        )

    # Initialize validation result variables
    validation_result = None

    # Validate credentials if access_token is being updated (and is not empty)
    # Empty string means "don't update the token"
    if config_update.access_token is not None and config_update.access_token.strip():
        validation_result = await validate_gitlab_credentials(
            config_update.gitlab_url or config.gitlab_url,
            config_update.access_token
        )
        # Update token and is_active status based on validation
        config.access_token_encrypted = encrypt_token(config_update.access_token)
        config.is_active = validation_result.is_valid

    # Update other fields
    if config_update.config_name is not None:
        config.config_name = config_update.config_name
    if config_update.gitlab_url is not None:
        config.gitlab_url = config_update.gitlab_url
    if config_update.project_id is not None:
        config.project_id = config_update.project_id
    if config_update.is_active is not None and config_update.access_token is None:
        # Only allow manual is_active updates if token is not being changed
        config.is_active = config_update.is_active

    config.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(config)

    # Build response with validation details if validation occurred
    if validation_result:
        response_dict = {
            "id": str(config.id),
            "config_name": config.config_name,
            "gitlab_url": config.gitlab_url,
            "project_id": config.project_id,
            "is_active": config.is_active,
            "created_at": config.created_at,
            "updated_at": config.updated_at,
            "validation_message": validation_result.error_message or "Credentials validated successfully",
            "validation_error_code": validation_result.error_code,
            "gitlab_username": validation_result.gitlab_username
        }
        return response_dict

    return config


@app.delete("/api/gitlab/config/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gitlab_config(
    config_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete GitLab configuration"""
    config = db.query(GitLabConfig).filter(
        GitLabConfig.id == config_id,
        GitLabConfig.user_id == current_user.id
    ).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="GitLab configuration not found"
        )

    db.delete(config)
    db.commit()

    return None


# ==================== Chat Endpoints ====================

@app.get("/api/status")
async def get_status() -> ModelStatus:
    """Get current model status"""
    try:
        model_name = os.getenv("OLLAMA_MODEL", "llama3.2")
        return ModelStatus(
            status="active",
            model_name=model_name,
            last_updated=datetime.now().isoformat()
        )
    except Exception as e:
        return ModelStatus(
            status="inactive",
            model_name="unknown",
            last_updated=datetime.now().isoformat()
        )


@app.post("/api/chat")
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user)
) -> ChatResponse:
    """Send message to Ollama model (requires authentication)"""
    try:
        run_output = agent.run(request.message)

        response_text = ""
        if hasattr(run_output, 'content'):
            response_text = run_output.content
        elif hasattr(run_output, 'text'):
            response_text = run_output.text
        elif hasattr(run_output, 'message'):
            if hasattr(run_output.message, 'content'):
                response_text = run_output.message.content
            else:
                response_text = str(run_output.message)
        else:
            response_text = str(run_output)

        return ChatResponse(
            response=response_text,
            model=os.getenv("OLLAMA_MODEL", "llama3.2"),
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model error: {str(e)}")


@app.get("/health")
async def health():
    """Health check endpoint"""
    try:
        return {
            "status": "connected",
            "model": os.getenv("OLLAMA_MODEL"),
            "host": os.getenv("OLLAMA_BASE_URL")
        }
    except Exception as e:
        return {"status": "disconnected", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", os.getenv("PORT", 3000)))
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
