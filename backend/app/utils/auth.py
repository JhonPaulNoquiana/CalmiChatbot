import jwt
import os
import random
import string
import smtplib
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


# Your existing functions remain the same...
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

# ==============================
# NEW PASSWORD RESET FUNCTIONS
# ==============================

def generate_reset_code():
    """Generate a 6-digit reset code"""
    return ''.join(random.choices(string.digits, k=6))

def send_reset_email(email, reset_code):
    """Send password reset email"""
    try:
        # Get email configuration from environment
        smtp_host = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('EMAIL_PORT', 587))
        email_user = os.getenv('EMAIL_USER', '')
        email_password = os.getenv('EMAIL_PASSWORD', '')
        
        # If email not configured, log and return True for development
        if not email_user or not email_password:
            print(f"[DEV MODE] Password reset code for {email}: {reset_code}")
            print("[DEV MODE] Email not sent - configure EMAIL_USER and EMAIL_PASSWORD in .env")
            return True
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Calmi - Password Reset Code'
        msg['From'] = email_user
        msg['To'] = email
        
        # HTML email content
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .code {{ font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea; text-align: center; margin: 20px 0; padding: 15px; background: white; border-radius: 8px; border: 2px dashed #667eea; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
                .note {{ background: #fff3cd; padding: 10px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Calmi</h1>
                    <p>Your Mental Wellness Companion</p>
                </div>
                <div class="content">
                    <h2>Password Reset Request</h2>
                    <p>Hello,</p>
                    <p>You requested to reset your password for your Calmi account.</p>
                    <p>Use the following verification code to reset your password:</p>
                    
                    <div class="code">{reset_code}</div>
                    
                    <div class="note">
                        <p><strong>Note:</strong> This code will expire in 15 minutes.</p>
                    </div>
                    
                    <p>If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
                    
                    <div class="footer">
                        <p>With care,<br>The Calmi Team 💙</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html, 'html'))
        
        # Send email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(email_user, email_password)
            server.send_message(msg)
        
        print(f"Reset email sent to {email}")
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        # For development, still return True and log the code
        print(f"[FALLBACK] Password reset code for {email}: {reset_code}")
        return False

def create_password_reset_token(user_id, reset_code, db_session, PasswordResetToken):
    """Create or update password reset token in database"""
    try:
        # Delete any existing tokens for this user
        PasswordResetToken.query.filter_by(user_id=user_id).delete()
        
        # Create new reset token
        reset_token = PasswordResetToken(
            user_id=user_id,
            reset_code=reset_code,
            expires_at=datetime.utcnow() + timedelta(minutes=15),
            used=False
        )
        
        db_session.add(reset_token)
        db_session.commit()
        
        return reset_token
    except Exception as e:
        db_session.rollback()
        print(f"Error creating reset token: {e}")
        return None

def verify_reset_code_in_db(user_id, code, db_session, PasswordResetToken):
    """Verify reset code in database"""
    try:
        reset_token = PasswordResetToken.query.filter_by(
            user_id=user_id,
            reset_code=code,
            used=False
        ).first()
        
        if not reset_token:
            return False, "Invalid or expired reset code"
        
        if reset_token.expires_at < datetime.utcnow():
            return False, "Reset code has expired"
        
        return True, reset_token
    except Exception as e:
        print(f"Error verifying reset code: {e}")
        return False, "Error verifying reset code"

def mark_reset_token_used(reset_token, db_session):
    """Mark reset token as used"""
    try:
        reset_token.used = True
        db_session.commit()
        return True
    except Exception as e:
        db_session.rollback()
        print(f"Error marking token as used: {e}")
        return False

# ==============================
# PASSWORD RESET ROUTE HELPERS
# ==============================

def handle_forgot_password_request(email, User, db_session, PasswordResetToken):
    """Handle forgot password request"""
    try:
        # Check if user exists
        user = User.query.filter_by(email=email).first()
        if not user:
            # Security: Don't reveal if user exists or not
            return {'message': 'If an account exists with this email, a reset code will be sent'}, 200
        
        # Generate reset code
        reset_code = generate_reset_code()
        
        # Save reset token to database
        reset_token = create_password_reset_token(
            user.id, 
            reset_code, 
            db_session, 
            PasswordResetToken
        )
        
        if not reset_token:
            return {'error': 'Failed to create reset token'}, 500
        
        # Send email
        if send_reset_email(email, reset_code):
            return {'message': 'Reset code sent to your email'}, 200
        else:
            # Still return success in dev mode
            return {'message': 'Reset code generated', 'dev_code': reset_code}, 200
            
    except Exception as e:
        db_session.rollback()
        return {'error': str(e)}, 500

def handle_reset_code_verification(email, code, User, db_session, PasswordResetToken):
    """Handle reset code verification"""
    try:
        # Find user
        user = User.query.filter_by(email=email).first()
        if not user:
            return {'error': 'Invalid request'}, 400
        
        # Verify reset code
        is_valid, result = verify_reset_code_in_db(
            user.id, 
            code, 
            db_session, 
            PasswordResetToken
        )
        
        if not is_valid:
            return {'error': result}, 400
        
        return {'message': 'Code verified successfully'}, 200
        
    except Exception as e:
        return {'error': str(e)}, 500

def handle_password_reset(email, code, new_password, User, db_session, PasswordResetToken):
    """Handle password reset with verified code"""
    try:
        # Find user
        user = User.query.filter_by(email=email).first()
        if not user:
            return {'error': 'Invalid request'}, 400
        
        # Verify reset code
        is_valid, reset_token = verify_reset_code_in_db(
            user.id, 
            code, 
            db_session, 
            PasswordResetToken
        )
        
        if not is_valid:
            return {'error': reset_token}, 400
        
        # Validate new password
        is_strong, msg = validate_password_strength(new_password)
        if not is_strong:
            return {'error': msg}, 400
        
        # Update password
        user.password_hash = hash_password(new_password)
        
        # Mark token as used
        if not mark_reset_token_used(reset_token, db_session):
            return {'error': 'Failed to update token'}, 500
        
        db_session.commit()
        
        return {'message': 'Password reset successfully'}, 200
        
    except Exception as e:
        db_session.rollback()
        return {'error': str(e)}, 500