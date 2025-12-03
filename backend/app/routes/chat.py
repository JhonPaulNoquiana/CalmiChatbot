from flask import Blueprint, request, jsonify
from datetime import datetime
from app.models import db, Message, ChatSession
from app.services.gemini_service import GeminiService
from app.utils.auth import optional_token_required

chat_bp = Blueprint('chat', __name__)
gemini_service = GeminiService()


@chat_bp.route('/send', methods=['POST'])
@optional_token_required
def send_message():
    """Send message and get AI response"""
    try:
        data = request.get_json()
        
        if not data or not data.get('session_id') or not data.get('message'):
            return {'error': 'Session ID and message are required'}, 400
        
        session_id = data['session_id']
        message_text = data['message'].strip()
        
        if not message_text:
            return {'error': 'Message cannot be empty'}, 400
        
        # Get or create chat session
        chat_session = ChatSession.query.filter_by(session_id=session_id).first()
        if not chat_session:
            chat_session = ChatSession(
                session_id=session_id,
                user_id=request.user_id,
                is_guest=not request.user_id
            )
            db.session.add(chat_session)
            db.session.commit()
        
        # Save user message
        sentiment = gemini_service.analyze_sentiment(message_text)
        user_message = Message(
            session_id=chat_session.id,
            user_id=request.user_id,
            sender='user',
            text=message_text,
            sentiment=sentiment
        )
        db.session.add(user_message)
        db.session.commit()
        
        # Get recent conversation context
        recent_messages = Message.query.filter_by(
            session_id=chat_session.id
        ).order_by(Message.created_at.desc()).limit(10).all()
        
        context = [
            {
                'role': 'user' if msg.sender == 'user' else 'model',
                'content': msg.text
            }
            for msg in reversed(recent_messages)
        ]
        
        # Generate AI response
        ai_response = gemini_service.generate_response(
            message_text,
            sentiment,
            context
        )
        
        # Save bot message
        bot_message = Message(
            session_id=chat_session.id,
            user_id=request.user_id,
            sender='bot',
            text=ai_response,
            sentiment='positive'
        )
        db.session.add(bot_message)
        
        # Update session message count
        chat_session.message_count += 2
        db.session.commit()
        
        return {
            'message': ai_response,
            'sentiment': sentiment,
            'timestamp': datetime.utcnow().strftime('%I:%M %p')
        }, 200
    
    except Exception as e:
        db.session.rollback()
        print(f"Error sending message: {e}")
        return {'error': 'Failed to send message', 'details': str(e)}, 500


@chat_bp.route('/history/<int:session_id>', methods=['GET'])
def get_chat_history(session_id):
    """Get chat history for a session"""
    try:
        messages = Message.query.filter_by(
            session_id=session_id
        ).order_by(Message.created_at.asc()).all()
        
        return {
            'session_id': session_id,
            'messages': [msg.to_dict() for msg in messages],
            'message_count': len(messages)
        }, 200
    
    except Exception as e:
        print(f"Error fetching chat history: {e}")
        return {'error': 'Failed to fetch chat history', 'details': str(e)}, 500


@chat_bp.route('/session', methods=['POST'])
@optional_token_required
def create_session():
    """Create a new chat session"""
    try:
        data = request.get_json()
        
        if not data or not data.get('session_id'):
            return {'error': 'Session ID is required'}, 400
        
        session_id = data['session_id']
        
        # Check if session already exists
        existing_session = ChatSession.query.filter_by(session_id=session_id).first()
        if existing_session:
            return {'session': existing_session.to_dict()}, 200
        
        # Create new session
        new_session = ChatSession(
            session_id=session_id,
            user_id=request.user_id,
            is_guest=not request.user_id
        )
        db.session.add(new_session)
        db.session.commit()
        
        return {'session': new_session.to_dict()}, 201
    
    except Exception as e:
        db.session.rollback()
        print(f"Error creating session: {e}")
        return {'error': 'Failed to create session', 'details': str(e)}, 500


@chat_bp.route('/sessions', methods=['GET'])
@optional_token_required
def get_sessions():
    """Get all user sessions"""
    try:
        if not request.user_id:
            return {'error': 'Not authenticated'}, 401
        
        sessions = ChatSession.query.filter_by(
            user_id=request.user_id
        ).order_by(ChatSession.started_at.desc()).limit(50).all()
        
        return {
            'sessions': [session.to_dict() for session in sessions],
            'count': len(sessions)
        }, 200
    
    except Exception as e:
        print(f"Error fetching sessions: {e}")
        return {'error': 'Failed to fetch sessions', 'details': str(e)}, 500


@chat_bp.route('/session/<int:session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a chat session"""
    try:
        session = ChatSession.query.get(session_id)
        
        if not session:
            return {'error': 'Session not found'}, 404
        
        # Delete all messages in the session (cascade handled by model)
        db.session.delete(session)
        db.session.commit()
        
        return {'message': 'Session deleted successfully'}, 200
    
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting session: {e}")
        return {'error': 'Failed to delete session', 'details': str(e)}, 500