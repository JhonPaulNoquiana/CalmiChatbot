from flask import Blueprint, request, jsonify
from datetime import datetime
from app.models import db, User, PasswordResetToken
from app.utils.auth import (
    hash_password, check_password, validate_email,
    validate_password_strength, generate_token, token_required,
    generate_reset_code, send_reset_email, create_password_reset_token,
    verify_reset_code_in_db, mark_reset_token_used
)

auth_bp = Blueprint('auth', __name__)

# Your existing routes (register, login, verify, profile) remain the same...

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

# ==============================
# NEW PASSWORD RESET ROUTES
# ==============================

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Send password reset code to email"""
    try:
        print("🔍 DEBUG: forgot_password function called!")
        
        data = request.get_json()
        print(f"🔍 DEBUG: Request data: {data}")
        
        if not data:
            return {'error': 'No JSON data received'}, 400
        
        email = data.get('email')
        print(f"🔍 DEBUG: Email from request: {email}")
        
        if not email:
            return {'error': 'Email is required'}, 400
        
        email = email.lower()
        print(f"🔍 DEBUG: Email (lowercase): {email}")
        
        # Simple email validation
        if '@' not in email or '.' not in email:
            return {'error': 'Invalid email format'}, 400
        
        print("🔍 DEBUG: Email validation passed")
        
        # Check if user exists - use direct SQL for debugging
        from app.models import db
        
        
        # Now query the user
        print(f"🔍 DEBUG: Querying user with email: {email}")
        from app.models import User
        user = User.query.filter_by(email=email).first()
        
        print(f"🔍 DEBUG: User found: {user is not None}")
        if user:
            print(f"🔍 DEBUG: User ID: {user.id}")
        
        if not user:
            # For debugging, tell us the user doesn't exist
            print(f"🔍 DEBUG: User with email {email} not found")
            return {'error': 'No account found with this email address'}, 404
        
        print("🔍 DEBUG: User exists, continuing...")
        
        # Generate reset code
        from app.utils.auth import generate_reset_code
        reset_code = generate_reset_code()
        print(f"🔍 DEBUG: Generated reset code: {reset_code}")
        
        # Clean up old tokens for this user
        from app.models import PasswordResetToken
        deleted_count = PasswordResetToken.query.filter_by(user_id=user.id).delete()
        print(f"🔍 DEBUG: Deleted old tokens: {deleted_count}")
        
        # Create new reset token
        from datetime import datetime, timedelta
        reset_token = PasswordResetToken(
            user_id=user.id,
            reset_code=reset_code,
            expires_at=datetime.utcnow() + timedelta(minutes=15),
            used=False
        )
        
        print(f"🔍 DEBUG: Created token object")
        
        db.session.add(reset_token)
        print(f"🔍 DEBUG: Token added to session")
        
        db.session.commit()
        print(f"🔍 DEBUG: Commit successful!")
        
        # Send email
        from app.utils.auth import send_reset_email
        print(f"🔍 DEBUG: Calling send_reset_email...")
        email_sent = send_reset_email(email, reset_code)
        print(f"🔍 DEBUG: Email sent: {email_sent}")
        
        if email_sent:
            return {'message': 'Reset code sent to your email'}, 200
        else:
            # For development, return the code
            return {
                'message': 'Reset code generated',
                'dev_code': reset_code,
                'note': 'Configure EMAIL_USER and EMAIL_PASSWORD in .env for real emails'
            }, 200
            
    except Exception as e:
        print(f"❌ CRITICAL ERROR in forgot_password: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()  # This will print the full traceback
        
        # Rollback if there's a session
        try:
            from app.models import db
            db.session.rollback()
            print("🔍 DEBUG: Session rolled back")
        except:
            pass
            
        return {'error': f'Failed to process request: {str(e)}'}, 500


@auth_bp.route('/verify-reset-code', methods=['POST'])
def verify_reset_code():
    """Verify the reset code"""
    try:
        data = request.get_json()
        email = data.get('email')
        code = data.get('code')
        
        if not email or not code:
            return {'error': 'Email and code are required'}, 400
        
        # Find user
        user = User.query.filter_by(email=email.lower()).first()
        if not user:
            return {'error': 'Invalid request'}, 400
        
        # Find reset token
        reset_token = PasswordResetToken.query.filter_by(
            user_id=user.id,
            reset_code=code,
            used=False
        ).first()
        
        if not reset_token:
            return {'error': 'Invalid or expired code'}, 400
        
        if reset_token.expires_at < datetime.utcnow():
            return {'error': 'Code has expired'}, 400
        
        return {'message': 'Code verified successfully'}, 200
        
    except Exception as e:
        print(f"Verify reset code error: {e}")
        return {'error': 'Failed to verify code'}, 500


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password with verified code"""
    try:
        data = request.get_json()
        email = data.get('email')
        code = data.get('code')
        new_password = data.get('newPassword')
        
        if not email or not code or not new_password:
            return {'error': 'All fields are required'}, 400
        
        # Validate password strength
        is_valid, message = validate_password_strength(new_password)
        if not is_valid:
            return {'error': message}, 400
        
        # Find user
        user = User.query.filter_by(email=email.lower()).first()
        if not user:
            return {'error': 'Invalid request'}, 400
        
        # Find and verify reset token
        reset_token = PasswordResetToken.query.filter_by(
            user_id=user.id,
            reset_code=code,
            used=False
        ).first()
        
        if not reset_token:
            return {'error': 'Invalid or expired code'}, 400
        
        if reset_token.expires_at < datetime.utcnow():
            return {'error': 'Code has expired'}, 400
        
        # Update password
        user.password = hash_password(new_password)
        
        # Mark token as used
        reset_token.used = True
        
        db.session.commit()
        
        return {'message': 'Password reset successfully'}, 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Reset password error: {e}")
        return {'error': 'Failed to reset password'}, 500


# Optional: Add a route to check password reset status
@auth_bp.route('/password-reset-status/<email>', methods=['GET'])
def password_reset_status(email):
    """Check if a password reset request exists for email"""
    try:
        user = User.query.filter_by(email=email.lower()).first()
        if not user:
            return {'has_reset_request': False}, 200
        
        reset_token = PasswordResetToken.query.filter_by(
            user_id=user.id,
            used=False
        ).first()
        
        if not reset_token:
            return {'has_reset_request': False}, 200
        
        # Check if expired
        if reset_token.expires_at < datetime.utcnow():
            return {'has_reset_request': False}, 200
        
        return {
            'has_reset_request': True,
            'expires_in_minutes': int((reset_token.expires_at - datetime.utcnow()).total_seconds() / 60)
        }, 200
        
    except Exception as e:
        print(f"Password reset status error: {e}")
        return {'error': 'Failed to check status'}, 500