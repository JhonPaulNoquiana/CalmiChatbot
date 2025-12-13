from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import config
from app.models import db

jwt = JWTManager()

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize database and JWT
    db.init_app(app)
    jwt.init_app(app)

    # CRITICAL: CORS Configuration
    CORS(app, resources={
        r"/api/*": {
            "origins": [
                "https://calmi-chatbot-project.vercel.app",  
                "http://localhost:5173"
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })


    # 1. Initialization Blueprint
    from .routes.init_db import init_bp
    app.register_blueprint(init_bp, url_prefix='/api')

    # 2. Core Application Blueprints
    from .routes.auth import auth_bp
    from .routes.chat import chat_bp
    from .routes.mood import mood_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(mood_bp, url_prefix='/api/mood')

    return app
