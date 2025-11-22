#!/usr/bin/env python3
"""
Martin-Coder Demo Setup Script
Sets up a complete demo environment with sample data
"""

import os
import sys
import json
import shutil
import subprocess
from pathlib import Path
from datetime import datetime, timedelta
import secrets

# Demo configuration
DEMO_CONFIG = {
    "user": {
        "email": "demo@martin-coder.com",
        "username": "demo",
        "password": "demo123"
    },
    "projects": [
        {
            "name": "fastapi-demo",
            "description": "Demo FastAPI REST API project",
            "language": "python"
        },
        {
            "name": "react-dashboard",
            "description": "Demo React Dashboard application",
            "language": "typescript"
        },
        {
            "name": "cli-tool",
            "description": "Demo Python CLI tool",
            "language": "python"
        }
    ]
}


def print_banner():
    """Print demo setup banner."""
    banner = """
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     ███╗   ███╗ █████╗ ██████╗ ████████╗██╗███╗   ██╗       ║
║     ████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝██║████╗  ██║       ║
║     ██╔████╔██║███████║██████╔╝   ██║   ██║██╔██╗ ██║       ║
║     ██║╚██╔╝██║██╔══██║██╔══██╗   ██║   ██║██║╚██╗██║       ║
║     ██║ ╚═╝ ██║██║  ██║██║  ██║   ██║   ██║██║ ╚████║       ║
║     ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝╚═╝  ╚═══╝       ║
║                     ██████╗ ██████╗ ██████╗ ███████╗██████╗ ║
║                    ██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗║
║                    ██║     ██║   ██║██║  ██║█████╗  ██████╔╝║
║                    ██║     ██║   ██║██║  ██║██╔══╝  ██╔══██╗║
║                    ╚██████╗╚██████╔╝██████╔╝███████╗██║  ██║║
║                     ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝║
║                                                              ║
║                    🚀 DEMO SETUP 🚀                          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)


def check_requirements():
    """Check if all requirements are met."""
    print("\n📋 Checking requirements...")

    errors = []

    # Check Python version
    if sys.version_info < (3, 11):
        errors.append("Python 3.11+ is required")
    else:
        print("  ✓ Python version OK")

    # Check Node.js
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        version = result.stdout.strip().replace("v", "")
        major = int(version.split(".")[0])
        if major < 20:
            errors.append("Node.js 20+ is required")
        else:
            print("  ✓ Node.js version OK")
    except FileNotFoundError:
        errors.append("Node.js not found")

    # Check npm
    try:
        subprocess.run(["npm", "--version"], capture_output=True, check=True)
        print("  ✓ npm OK")
    except (FileNotFoundError, subprocess.CalledProcessError):
        errors.append("npm not found")

    if errors:
        print("\n❌ Requirements check failed:")
        for error in errors:
            print(f"  - {error}")
        return False

    print("\n✅ All requirements met!")
    return True


def setup_environment():
    """Set up environment variables for demo."""
    print("\n🔧 Setting up environment...")

    root_dir = Path(__file__).parent.parent
    env_file = root_dir / ".env"
    env_example = root_dir / ".env.example"

    # Create .env from example if not exists
    if not env_file.exists() and env_example.exists():
        shutil.copy(env_example, env_file)
        print("  ✓ Created .env from .env.example")

    # Read current env
    env_vars = {}
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env_vars[key] = value

    # Set demo-specific variables
    demo_vars = {
        "DEMO_MODE": "true",
        "DEBUG": "true",
        "SECRET_KEY": secrets.token_hex(32),
        "DATABASE_URL": "sqlite:///./demo_data/martin_coder_demo.db",
        "DEFAULT_AI_PROVIDER": "demo",
        "DEFAULT_AI_MODEL": "demo-model",
    }

    env_vars.update(demo_vars)

    # Write updated env
    with open(env_file, "w") as f:
        for key, value in env_vars.items():
            f.write(f"{key}={value}\n")

    print("  ✓ Environment configured for demo mode")
    return True


def create_demo_directories():
    """Create necessary directories for demo."""
    print("\n📁 Creating demo directories...")

    root_dir = Path(__file__).parent.parent

    directories = [
        root_dir / "demo_data",
        root_dir / "demo_data" / "projects",
        root_dir / "demo_data" / "uploads",
        root_dir / "demo_data" / "chroma",
    ]

    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
        print(f"  ✓ Created {directory.relative_to(root_dir)}")

    return True


def create_demo_projects():
    """Create sample demo projects."""
    print("\n📦 Creating demo projects...")

    root_dir = Path(__file__).parent.parent
    projects_dir = root_dir / "demo_data" / "projects"

    # FastAPI Demo Project
    fastapi_dir = projects_dir / "fastapi-demo"
    fastapi_dir.mkdir(exist_ok=True)

    (fastapi_dir / "main.py").write_text('''"""
FastAPI Demo Application
A simple REST API showcasing Martin-Coder capabilities
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

app = FastAPI(
    title="FastAPI Demo",
    description="Demo API generated with Martin-Coder",
    version="1.0.0"
)

# Models
class Item(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    price: float
    created_at: Optional[datetime] = None

class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float

# In-memory storage
items_db: List[Item] = []
item_counter = 0

@app.get("/")
def root():
    """Root endpoint"""
    return {"message": "Welcome to FastAPI Demo!", "docs": "/docs"}

@app.get("/items", response_model=List[Item])
def list_items():
    """List all items"""
    return items_db

@app.get("/items/{item_id}", response_model=Item)
def get_item(item_id: int):
    """Get a specific item"""
    for item in items_db:
        if item.id == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")

@app.post("/items", response_model=Item)
def create_item(item: ItemCreate):
    """Create a new item"""
    global item_counter
    item_counter += 1
    new_item = Item(
        id=item_counter,
        name=item.name,
        description=item.description,
        price=item.price,
        created_at=datetime.now()
    )
    items_db.append(new_item)
    return new_item

@app.delete("/items/{item_id}")
def delete_item(item_id: int):
    """Delete an item"""
    for i, item in enumerate(items_db):
        if item.id == item_id:
            items_db.pop(i)
            return {"message": "Item deleted"}
    raise HTTPException(status_code=404, detail="Item not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
''')

    (fastapi_dir / "requirements.txt").write_text('''fastapi>=0.109.0
uvicorn>=0.27.0
pydantic>=2.5.0
''')

    (fastapi_dir / "README.md").write_text('''# FastAPI Demo

A simple REST API demonstrating Martin-Coder capabilities.

## Features

- CRUD operations for items
- OpenAPI documentation
- Pydantic validation

## Run

```bash
pip install -r requirements.txt
python main.py
```

Visit http://localhost:8001/docs for API documentation.
''')

    print("  ✓ Created fastapi-demo project")

    # React Dashboard Project
    react_dir = projects_dir / "react-dashboard"
    react_dir.mkdir(exist_ok=True)
    (react_dir / "src").mkdir(exist_ok=True)

    (react_dir / "src" / "App.tsx").write_text('''import React, { useState, useEffect } from 'react';

interface DashboardStats {
  totalUsers: number;
  activeProjects: number;
  completedTasks: number;
  revenue: number;
}

function App() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeProjects: 0,
    completedTasks: 0,
    revenue: 0,
  });

  useEffect(() => {
    // Simulate loading stats
    setStats({
      totalUsers: 1234,
      activeProjects: 56,
      completedTasks: 789,
      revenue: 45678,
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Dashboard Demo
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={stats.totalUsers} icon="👥" />
        <StatCard title="Active Projects" value={stats.activeProjects} icon="📁" />
        <StatCard title="Completed Tasks" value={stats.completedTasks} icon="✅" />
        <StatCard title="Revenue" value={`$${stats.revenue}`} icon="💰" />
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  );
}

export default App;
''')

    (react_dir / "package.json").write_text('''{
  "name": "react-dashboard-demo",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
''')

    print("  ✓ Created react-dashboard project")

    # CLI Tool Project
    cli_dir = projects_dir / "cli-tool"
    cli_dir.mkdir(exist_ok=True)

    (cli_dir / "cli.py").write_text('''#!/usr/bin/env python3
"""
Demo CLI Tool
A command-line tool generated with Martin-Coder
"""

import typer
from rich.console import Console
from rich.table import Table
from rich.progress import track
import time

app = typer.Typer(
    name="demo-cli",
    help="Demo CLI tool showcasing Martin-Coder capabilities"
)
console = Console()

@app.command()
def hello(name: str = typer.Argument("World")):
    """Say hello to someone."""
    console.print(f"[bold green]Hello, {name}![/bold green]")

@app.command()
def stats():
    """Show demo statistics."""
    table = Table(title="Demo Statistics")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("Files Processed", "1,234")
    table.add_row("Lines of Code", "56,789")
    table.add_row("AI Suggestions", "890")
    table.add_row("Time Saved", "45 hours")

    console.print(table)

@app.command()
def process(items: int = typer.Option(10, help="Number of items to process")):
    """Process items with progress bar."""
    for _ in track(range(items), description="Processing..."):
        time.sleep(0.1)
    console.print("[bold green]✓ Processing complete![/bold green]")

if __name__ == "__main__":
    app()
''')

    (cli_dir / "requirements.txt").write_text('''typer>=0.9.0
rich>=13.7.0
''')

    print("  ✓ Created cli-tool project")

    return True


def create_demo_chats():
    """Create sample chat conversations for demo."""
    print("\n💬 Creating demo chat data...")

    root_dir = Path(__file__).parent.parent
    chats_file = root_dir / "demo_data" / "demo_chats.json"

    demo_chats = [
        {
            "id": "chat-001",
            "title": "Create REST API endpoints",
            "created_at": (datetime.now() - timedelta(hours=2)).isoformat(),
            "messages": [
                {
                    "role": "user",
                    "content": "Help me create CRUD endpoints for a user management system"
                },
                {
                    "role": "assistant",
                    "content": """I'll help you create CRUD endpoints for user management. Here's a complete implementation:

```python
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.post("/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = User(**user.dict())
    db.add(db_user)
    db.commit()
    return db_user

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    for key, value in user.dict(exclude_unset=True).items():
        setattr(db_user, key, value)
    db.commit()
    return db_user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted"}
```

This includes all standard CRUD operations with proper error handling and Pydantic validation."""
                }
            ]
        },
        {
            "id": "chat-002",
            "title": "Debug authentication issue",
            "created_at": (datetime.now() - timedelta(hours=5)).isoformat(),
            "messages": [
                {
                    "role": "user",
                    "content": "My JWT authentication is returning 401 errors even with valid tokens"
                },
                {
                    "role": "assistant",
                    "content": """I'll help you debug the JWT authentication issue. Let me analyze common causes:

**Common Issues:**

1. **Token Expiration** - Check if the token hasn't expired
2. **Secret Key Mismatch** - Ensure the same secret is used for signing and verification
3. **Algorithm Mismatch** - Verify the algorithm matches (HS256, RS256, etc.)

**Here's a debug helper:**

```python
import jwt
from datetime import datetime

def debug_token(token: str, secret_key: str):
    try:
        # Decode without verification first
        unverified = jwt.decode(token, options={"verify_signature": False})
        print(f"Token payload: {unverified}")

        # Check expiration
        exp = unverified.get('exp')
        if exp:
            exp_date = datetime.fromtimestamp(exp)
            if datetime.now() > exp_date:
                print(f"❌ Token expired at {exp_date}")
            else:
                print(f"✓ Token valid until {exp_date}")

        # Now verify signature
        verified = jwt.decode(token, secret_key, algorithms=["HS256"])
        print("✓ Signature valid")
        return verified

    except jwt.ExpiredSignatureError:
        print("❌ Token has expired")
    except jwt.InvalidSignatureError:
        print("❌ Invalid signature - check your secret key")
    except jwt.DecodeError as e:
        print(f"❌ Decode error: {e}")
```

**Run this to identify the exact issue!**"""
                }
            ]
        },
        {
            "id": "chat-003",
            "title": "Optimize database queries",
            "created_at": (datetime.now() - timedelta(days=1)).isoformat(),
            "messages": [
                {
                    "role": "user",
                    "content": "My API is slow because of N+1 query problems. How do I fix it?"
                },
                {
                    "role": "assistant",
                    "content": """The N+1 problem is a common performance issue. Here's how to fix it with SQLAlchemy:

**Problem Example:**
```python
# Bad - N+1 queries
users = db.query(User).all()
for user in users:
    print(user.posts)  # Each access triggers a new query!
```

**Solution 1: Eager Loading with joinedload**
```python
from sqlalchemy.orm import joinedload

# Good - Single query with JOIN
users = db.query(User).options(joinedload(User.posts)).all()
```

**Solution 2: selectinload for large collections**
```python
from sqlalchemy.orm import selectinload

# Better for large collections - 2 queries total
users = db.query(User).options(selectinload(User.posts)).all()
```

**Solution 3: Subquery loading**
```python
from sqlalchemy.orm import subqueryload

users = db.query(User).options(subqueryload(User.posts)).all()
```

**Best Practice - Configure default loading:**
```python
class User(Base):
    __tablename__ = 'users'

    posts = relationship("Post", lazy="selectin")  # Default eager loading
```

This will dramatically improve your API response times!"""
                }
            ]
        }
    ]

    with open(chats_file, "w") as f:
        json.dump(demo_chats, f, indent=2)

    print("  ✓ Created demo chat history")
    return True


def install_dependencies():
    """Install project dependencies."""
    print("\n📥 Installing dependencies...")

    root_dir = Path(__file__).parent.parent

    # Install Python dependencies
    api_dir = root_dir / "apps" / "api"
    if (api_dir / "requirements.txt").exists():
        print("  Installing Python dependencies...")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", "requirements.txt", "-q"],
            cwd=api_dir
        )
        print("  ✓ Python dependencies installed")

    # Install Node.js dependencies
    web_dir = root_dir / "apps" / "web"
    if (web_dir / "package.json").exists():
        print("  Installing Node.js dependencies...")
        subprocess.run(["npm", "install", "--silent"], cwd=web_dir)
        print("  ✓ Node.js dependencies installed")

    return True


def print_success():
    """Print success message with instructions."""
    print("""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              ✅ DEMO SETUP COMPLETE! ✅                      ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  To start the demo:                                          ║
║                                                              ║
║  1. Start the backend:                                       ║
║     cd apps/api && python -m uvicorn app.main:app --reload   ║
║                                                              ║
║  2. Start the frontend (new terminal):                       ║
║     cd apps/web && npm run dev                               ║
║                                                              ║
║  3. Open in browser:                                         ║
║     http://localhost:3000                                    ║
║                                                              ║
║  Demo credentials:                                           ║
║     Email: demo@martin-coder.com                             ║
║     Password: demo123                                        ║
║                                                              ║
║  Or run everything with:                                     ║
║     ./scripts/start-demo.sh                                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    """)


def main():
    """Main setup function."""
    print_banner()

    if not check_requirements():
        sys.exit(1)

    setup_environment()
    create_demo_directories()
    create_demo_projects()
    create_demo_chats()

    # Ask about installing dependencies
    install = input("\n📥 Install dependencies? (y/N): ").strip().lower()
    if install == "y":
        install_dependencies()

    print_success()


if __name__ == "__main__":
    main()
