from flask import Blueprint, request, jsonify
from datetime import datetime
from app.models import db, User
from app.utils.auth import (
    hash_password, check_password, validate_email,
    validate_password_strength, generate_token, token_required
)

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validation
        if not data or not data.get('email') or not data.get('password'):
            return {'error': 'Email and password are required'}, 400
        
        email = data['email'].lower()
        password = data['password']
        full_name = data.get('full_name', '')
        
        if not validate_email(email):
            return {'error': 'Invalid email format'}, 400
        
        is_valid, message = validate_password_strength(password)
        if not is_valid:
            return {'error': message}, 400
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return {'error': 'User with this email already exists'}, 409
        
        # Create new user
        user = User(
            email=email,
            password=hash_password(password),
            full_name=full_name
        )
        db.session.add(user)
        db.session.commit()
        
        # Generate token
        token = generate_token(user.id, email)
        
        return {
            'message': 'User registered successfully',
            'token': token,
            'user': {
                'id': user.id,
                'email': email,
                'full_name': full_name
            }
        }, 201
    
    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {e}")
        return {'error': 'Registration failed', 'details': str(e)}, 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return {'error': 'Email and password are required'}, 400
        
        email = data['email'].lower()
        password = data['password']
        
        # Find user
        user = User.query.filter_by(email=email).first()
        if not user:
            return {'error': 'Invalid email or password'}, 401
        
        # Check password
        if not check_password(password, user.password):
            return {'error': 'Invalid email or password'}, 401
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        db.session.commit()
        
        # Generate token
        token = generate_token(user.id, email)
        
        return {
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user.id,
                'email': email,
                'full_name': user.full_name or ''
            }
        }, 200
    
    except Exception as e:
        db.session.rollback()
        print(f"Login error: {e}")
        return {'error': 'Login failed', 'details': str(e)}, 500


@auth_bp.route('/verify', methods=['GET'])
@token_required
def verify_token():
    """Verify JWT token"""
    try:
        return {
            'valid': True,
            'user_id': request.user_id,
            'email': request.email
        }, 200
    except Exception as e:
        return {'error': 'Token verification failed'}, 401


@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile():
    """Get current user profile"""
    try:
        user = User.query.get(request.user_id)
        
        if not user:
            return {'error': 'User not found'}, 404
        
        return {
            'user': user.to_dict()
        }, 200
    
    except Exception as e:
        print(f"Profile fetch error: {e}")
        return {'error': 'Failed to fetch profile', 'details': str(e)}, 500
