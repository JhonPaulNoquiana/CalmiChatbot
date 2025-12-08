from flask import Blueprint, request, jsonify
from datetime import datetime
from app.models import db, Message, ChatSession, MoodEntry  # Added MoodEntry import
from app.services.groq_service import GroqService
from app.utils.auth import optional_token_required

chat_bp = Blueprint('chat', __name__)
groq_service = GroqService()


@chat_bp.route('/send', methods=['POST'])
@optional_token_required
def send_message():
    """Send message and get AI response with safety handling"""
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
        sentiment = groq_service.analyze_sentiment(message_text)
        user_message = Message(
            session_id=chat_session.id,
            user_id=request.user_id,
            sender='user',
            text=message_text,
            sentiment=sentiment
        )
        db.session.add(user_message)
        db.session.commit()
        
        # Session identifier for conversation memory
        user_identifier = f"session_{chat_session.id}"
        
        # Attempt to generate AI response safely
        try:
            ai_response = groq_service.generate_response(
                user_message=message_text,
                sentiment=sentiment,
                user_id=user_identifier
            )
        except Exception as safety_err:
            print(f"Safety block triggered: {safety_err}")
        
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


@chat_bp.route('/unified-sessions', methods=['GET'])
@optional_token_required
def get_unified_sessions():
    """Get all chat sessions with their mood entries (unified view)"""
    try:
        if not request.user_id:
            return {'error': 'Not authenticated'}, 401
        
        # Get all sessions for the current user
        sessions = ChatSession.query.filter_by(
            user_id=request.user_id
        ).order_by(ChatSession.started_at.desc()).limit(50).all()
        
        unified_sessions = []
        for session in sessions:
            # Get mood entry for this session
            mood_entry = MoodEntry.query.filter_by(session_id=session.id).first()
            
            # Get last message for preview
            last_message = Message.query.filter_by(
                session_id=session.id
            ).order_by(Message.created_at.desc()).first()
            
            # Build session data with mood entry
            session_data = session.to_dict()
            
            # Add mood entry data if exists
            if mood_entry:
                mood_data = mood_entry.to_dict()
                # Make sure we include the session_id string for frontend
                mood_data['session_id_string'] = session.session_id
                session_data['mood_entry'] = mood_data
            else:
                session_data['mood_entry'] = None
            
            # Add last message preview
            if last_message:
                preview = last_message.text
                if len(preview) > 50:
                    preview = preview[:47] + '...'
                session_data['last_message_preview'] = preview
            else:
                session_data['last_message_preview'] = 'No messages yet'
            
            unified_sessions.append(session_data)
        
        return {
            'sessions': unified_sessions,
            'count': len(unified_sessions)
        }, 200
    
    except Exception as e:
        print(f"Error fetching unified sessions: {e}")
        return {'error': 'Failed to fetch sessions', 'details': str(e)}, 500


@chat_bp.route('/session/<int:session_id>', methods=['DELETE'])
@optional_token_required
def delete_session(session_id):
    """Delete a chat session with all associated data"""
    try:
        session = ChatSession.query.get(session_id)
        
        if not session:
            return jsonify({
                'success': False,
                'error': 'Session not found'
            }), 404
        
        current_user_id = getattr(request, 'user_id', None)
        
        # Convert to int for comparison
        if current_user_id is not None:
            try:
                current_user_id_int = int(current_user_id)
            except (ValueError, TypeError):
                return jsonify({
                    'success': False,
                    'error': 'Invalid user ID'
                }), 400
        else:
            current_user_id_int = None
        
        # Check permissions
        if current_user_id_int is not None:
            # User is logged in
            if session.user_id == current_user_id_int:
                # User owns session - allow
                print(f"✅ User {current_user_id_int} owns session {session_id} - allowing deletion")
            elif session.user_id is None:
                # Guest session - allow logged in user to delete
                print(f"✅ User {current_user_id_int} deleting guest session {session_id}")
            else:
                print(f"❌ User {current_user_id_int} trying to delete session {session_id} owned by user {session.user_id}")
                return jsonify({
                    'success': False,
                    'error': 'Unauthorized to delete this session'
                }), 403
        else:
            # Not logged in
            if session.user_id is not None:
                print(f"❌ Guest trying to delete owned session {session_id}")
                return jsonify({
                    'success': False,
                    'error': 'Login required to delete this session'
                }), 401
            else:
                print(f"✅ Guest deleting guest session {session_id}")
        
        # Clear conversation memory
        user_identifier = f"session_{session.id}"
        groq_service.clear_history(user_identifier)
        
        # Delete the session (cascade delete will handle messages and mood entries)
        db.session.delete(session)
        db.session.commit()
        
        print(f"✅ Session {session_id} deleted successfully with all associated data")
        
        return jsonify({
            'success': True,
            'message': 'Session and all associated data deleted successfully',
            'session_id': session_id
        }), 200
    
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error deleting session {session_id}: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to delete session',
            'details': str(e)
        }), 500


# Optional: Add a session statistics endpoint for analytics
@chat_bp.route('/statistics', methods=['GET'])
@optional_token_required
def get_session_statistics():
    """Get statistics about user's chat sessions"""
    try:
        if not request.user_id:
            return {'error': 'Not authenticated'}, 401
        
        # Get all sessions for the current user
        sessions = ChatSession.query.filter_by(
            user_id=request.user_id
        ).all()
        
        total_sessions = len(sessions)
        total_messages = sum(session.message_count for session in sessions)
        sessions_with_mood = sum(1 for session in sessions 
                                if MoodEntry.query.filter_by(session_id=session.id).first())
        
        # Calculate average session length (in messages)
        avg_messages_per_session = total_messages / total_sessions if total_sessions > 0 else 0
        
        return {
            'statistics': {
                'total_sessions': total_sessions,
                'total_messages': total_messages,
                'sessions_with_mood': sessions_with_mood,
                'average_messages_per_session': round(avg_messages_per_session, 1),
                'mood_checkin_rate': round((sessions_with_mood / total_sessions * 100) if total_sessions > 0 else 0, 1)
            }
        }, 200
    
    except Exception as e:
        print(f"Error fetching session statistics: {e}")
        return {'error': 'Failed to fetch statistics', 'details': str(e)}, 500