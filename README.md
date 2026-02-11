# Code Review AI with GitLab Integration

AI-powered code review system with real-time GitLab credential validation, JWT authentication, and comprehensive configuration management.

## 🌟 Features

- **JWT Authentication**: Secure user registration and login
- **GitLab Integration**:
  - Real-time credential validation
  - Encrypted token storage (Fernet encryption)
  - Multiple GitLab account support with custom naming
  - Edit and manage configurations with validation
- **Modern UI**: Clean, professional interface built with React + TypeScript
- **Database Stack**: PostgreSQL for data, Qdrant for vectors, Redis for caching
- **Security First**: Bcrypt password hashing, SQL injection protection, encrypted secrets

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ & Yarn
- Python 3.10+

### 1. Clone and Setup
```bash
git clone <repository-url>
cd code-review
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start Databases
```bash
./start-databases.sh
# Or manually:
docker-compose up -d postgres qdrant redis
```

### 3. Setup Backend
```bash
cd backend
python3 -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
pip install -r requirements.txt

# Run database migration for config_name field
docker exec -i code-review-postgres psql -U postgres -d code_review < migrations/add_config_name.sql

# Start backend
python llm_service.py
```

### 4. Setup Frontend
```bash
cd frontend
yarn install
yarn dev
```

### 5. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/docs (Swagger UI)

## 📁 Project Structure

```
code-review/
├── backend/
│   ├── migrations/           # Database migration scripts
│   │   └── add_config_name.sql
│   ├── auth.py              # JWT authentication logic
│   ├── database.py          # Database connection setup
│   ├── encryption.py        # Token encryption utilities
│   ├── gitlab_validator.py  # GitLab API validation
│   ├── llm_service.py       # Main FastAPI application
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── init-db.sql         # Database initialization
│   └── requirements.txt     # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Auth/       # Login, Register
│   │   │   ├── ChatInterface.tsx
│   │   │   └── Sidebar/    # Settings sidebar
│   │   │       └── GitLabConfigSidebar.tsx
│   │   ├── services/       # API client, auth service
│   │   ├── types/          # TypeScript types
│   │   └── App.tsx         # Main app component
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml      # Database services
├── .env.example           # Environment variables template
├── start-databases.sh     # Database startup script
├── start-dev.sh          # Full stack startup
└── README.md             # This file
```

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# Database
POSTGRES_DB=code_review
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/code_review

# JWT
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Encryption
ENCRYPTION_KEY=your-fernet-encryption-key

# Ollama
OLLAMA_MODEL=llama2
OLLAMA_BASE_URL=http://localhost:11434

# Redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# Qdrant
QDRANT_PORT=6333

# Backend
BACKEND_PORT=3000
BACKEND_HOST=0.0.0.0

# Frontend
VITE_API_URL=http://localhost:3000
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (returns JWT token)
- `GET /api/auth/me` - Get current user info (requires auth)

### GitLab Configuration
- `POST /api/gitlab/config` - Create GitLab configuration with validation
- `GET /api/gitlab/configs` - List all user's configurations
- `GET /api/gitlab/config/{id}` - Get specific configuration
- `PUT /api/gitlab/config/{id}` - Update configuration with validation
- `DELETE /api/gitlab/config/{id}` - Delete configuration

### Chat
- `POST /api/chat` - Send message to AI (requires auth)
- `GET /api/status` - Check model status

## 🎯 Key Features Explained

### GitLab Credential Validation
When you add or update a GitLab configuration:
1. Backend calls GitLab API `/api/v4/user` to verify credentials
2. Sets `is_active=true` if valid, `is_active=false` if invalid
3. Returns detailed validation messages
4. Displays real-time status in the UI (✓ Valid / ⚠ Invalid)

### Configuration Management
- **Add**: Provide config name, GitLab URL, and access token
- **Edit**: Update any field; token is optional (keeps existing if empty)
- **Delete**: Remove configuration permanently
- **Validate**: Real-time validation with spinner and status updates

### Security Features
- **Passwords**: Hashed with bcrypt
- **GitLab Tokens**: Encrypted with Fernet symmetric encryption
- **JWT Tokens**: Secure authentication with expiration
- **SQL Injection**: Protected by SQLAlchemy ORM
- **CORS**: Configured for localhost development

## 🛠️ Development

### Backend Development
```bash
cd backend
source env/bin/activate
# Auto-reload on changes:
uvicorn llm_service:app --reload --host 0.0.0.0 --port 3000
```

### Frontend Development
```bash
cd frontend
yarn dev  # Auto-reload enabled
```

### Database Management

#### View Migrations
```bash
ls -la backend/migrations/
```

#### Run Specific Migration
```bash
docker exec -i code-review-postgres psql -U postgres -d code_review < backend/migrations/add_config_name.sql
```

#### View Database Schema
```bash
docker exec -it code-review-postgres psql -U postgres -d code_review -c "\d gitlab_configs"
```

#### Reset Database (⚠️ Destroys all data)
```bash
docker-compose down -v
docker-compose up -d postgres
docker exec -i code-review-postgres psql -U postgres -d code_review < backend/init-db.sql
```

## 🧪 Testing

### Test Backend API
```bash
./test-backend.sh
```

### Manual API Testing
```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123"
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if databases are running
docker ps | grep code-review

# View logs
docker logs code-review-postgres
docker logs code-review-redis
docker logs code-review-qdrant

# Restart databases
docker-compose restart
```

### Backend Issues
```bash
# Check backend logs
tail -f backend/backend.log  # If exists

# Verify Python dependencies
pip list | grep fastapi
```

### Frontend Issues
```bash
# Clear cache and reinstall
rm -rf node_modules yarn.lock
yarn install
```

## 📚 Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL 16
- **Vector DB**: Qdrant
- **Cache**: Redis 7
- **ORM**: SQLAlchemy
- **Auth**: JWT (python-jose)
- **Encryption**: Cryptography (Fernet)
- **Validation**: Pydantic
- **LLM**: Ollama integration

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Notifications**: Sonner
- **Routing**: React Router
- **HTTP Client**: Fetch API

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋 Support

For issues or questions, please open a GitHub issue.
