from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import config
from app.models import db

jwt = JWTManager()

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    db.init_app(app)
    jwt.init_app(app)
    
    # CRITICAL: CORS Configuration
    CORS(app, 
         origins=[app.config['CORS_ORIGIN']], 
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    
    # Import blueprints
    from app.routes.auth import auth_bp
    from app.routes.chat import chat_bp
    from app.routes.mood import mood_bp
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(mood_bp, url_prefix='/api/mood')
    
    @app.route('/api/health')
    def health():
        return {'status': 'ok'}, 200
    
    with app.app_context():
        db.create_all()
    
    print("✅ App initialized")
    print(f"✅ Chat route: /api/chat/send")
    
    return app


# from flask import Flask
# from flask_cors import CORS
# import os

# from app.models import db


# def create_app(config_name=None):
#     """Application factory"""
#     if config_name is None:
#         config_name = os.getenv('FLASK_ENV', 'development')
    
#     from config import config
    
#     app = Flask(__name__)
#     app.config.from_object(config[config_name])
    
#     # Initialize extensions
#     db.init_app(app)
#     CORS(app, resources={r"/api/*": {
#         "origins": app.config['CORS_ORIGIN'],
#         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
#         "allow_headers": ["Content-Type", "Authorization"]
#     }})
    
#     # Create database tables
#     with app.app_context():
#         db.create_all()
    
#     # Register blueprints
#     from app.routes.auth import auth_bp
#     from app.routes.chat import chat_bp
#     from app.routes.mood import mood_bp
    
#     app.register_blueprint(auth_bp, url_prefix='/api/auth')
#     app.register_blueprint(chat_bp, url_prefix='/api/chat')
#     app.register_blueprint(mood_bp, url_prefix='/api/mood')
    
#     # Health check endpoint
#     @app.route('/api/health', methods=['GET'])
#     def health_check():
#         return {
#             'status': 'healthy',
#             'environment': app.config.get('FLASK_ENV', 'development')
#         }, 200
    
#     # Error handlers
#     @app.errorhandler(404)
#     def not_found(error):
#         return {'error': 'Not found'}, 404
    
#     @app.errorhandler(500)
#     def internal_error(error):
#         return {'error': 'Internal server error'}, 500
    
#     return app
