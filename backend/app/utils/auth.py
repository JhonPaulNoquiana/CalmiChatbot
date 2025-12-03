import jwt
import os
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import re


def hash_password(password):
    """Hash password"""
    return generate_password_hash(password)


def check_password(password, hash_):
    """Check password against hash"""
    return check_password_hash(hash_, password)


def validate_email(email):
    """Validate email format"""
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None


def validate_password_strength(password):
    """Validate password strength"""
    if len(password) < 6:
        return False, 'Password must be at least 6 characters long'
    return True, None


def generate_token(user_id, email):
    """Generate JWT token"""
    try:
        expiry = datetime.utcnow() + timedelta(
            hours=int(os.getenv('JWT_EXPIRY_HOURS', 24))
        )
        payload = {
            'user_id': str(user_id),
            'email': email,
            'exp': expiry
        }
        token = jwt.encode(
            payload,
            os.getenv('JWT_SECRET_KEY', 'jwt-secret-key'),
            algorithm=os.getenv('JWT_ALGORITHM', 'HS256')
        )
        return token
    except Exception as e:
        print(f"Error generating token: {e}")
        return None


def verify_token(token):
    """Verify JWT token"""
    try:
        payload = jwt.decode(
            token,
            os.getenv('JWT_SECRET_KEY', 'jwt-secret-key'),
            algorithms=[os.getenv('JWT_ALGORITHM', 'HS256')]
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_required(f):
    """Decorator for routes requiring authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return {'error': 'Invalid authorization header'}, 401
        
        if not token:
            return {'error': 'No token provided'}, 401
        
        payload = verify_token(token)
        if not payload:
            return {'error': 'Invalid or expired token'}, 401
        
        request.user_id = payload.get('user_id')
        request.email = payload.get('email')
        
        return f(*args, **kwargs)
    
    return decorated_function


def optional_token_required(f):
    """Decorator for routes with optional authentication (guest support)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        request.user_id = None
        request.email = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
                payload = verify_token(token)
                if payload:
                    request.user_id = payload.get('user_id')
                    request.email = payload.get('email')
            except (IndexError, Exception):
                pass  # Continue without auth for optional routes
        
        return f(*args, **kwargs)
    
    return decorated_function
