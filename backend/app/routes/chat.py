from flask import Blueprint, request, jsonify
from datetime import datetime
from app.models import db, Message, ChatSession, MoodEntry
from app.services.groq_service import GroqService
from app.utils.auth import optional_token_required

# Chat Blueprint initialization
chat_bp = Blueprint('chat', __name__)
groq_service = GroqService()


@chat_bp.route('/send', methods=['POST'])
@optional_token_required
def send_message():
    """Send a user message and return an AI response."""
    try:
        data = request.get_json()

        # Basic validation
        if not data or not data.get('session_id') or not data.get('message'):
            return {'error': 'Session ID and message are required'}, 400

        session_id = data['session_id']
        message_text = data['message'].strip()

        if not message_text:
            return {'error': 'Message cannot be empty'}, 400

        # Fetch or create session
        chat_session = ChatSession.query.filter_by(session_id=session_id).first()
        if not chat_session:
            chat_session = ChatSession(
                session_id=session_id,
                user_id=request.user_id,
                is_guest=not request.user_id
            )
            db.session.add(chat_session)
            db.session.commit()

        # Sentiment analysis
        sentiment = groq_service.analyze_sentiment(message_text)

        # Save user message
        user_message = Message(
            session_id=chat_session.id,
            user_id=request.user_id,
            sender='user',
            text=message_text,
            sentiment=sentiment
        )
        db.session.add(user_message)
        db.session.commit()

        # ID for conversation memory
        user_identifier = f"session_{chat_session.id}"

        # Generate AI response
        try:
            ai_response = groq_service.generate_response(
                user_message=message_text,
                sentiment=sentiment,
                user_id=user_identifier
            )
        except Exception as error:
            print(f"[AI Safety] Response generation blocked: {error}")
            ai_response = "I'm having trouble processing that right now."

        # Save bot reply
        bot_message = Message(
            session_id=chat_session.id,
            user_id=request.user_id,
            sender='bot',
            text=ai_response,
            sentiment='positive'
        )
        db.session.add(bot_message)

        # Update total message count
        chat_session.message_count += 2
        db.session.commit()

        return {
            'message': ai_response,
            'sentiment': sentiment,
            'timestamp': datetime.utcnow().strftime('%I:%M %p')
        }, 200

    except Exception as e:
        db.session.rollback()
        print(f"Error in send_message: {e}")
        return {'error': 'Failed to send message', 'details': str(e)}, 500


@chat_bp.route('/history/<int:session_id>', methods=['GET'])
def get_chat_history(session_id):
    """Retrieve chat history for a given session."""
    try:
        messages = (
            Message.query
            .filter_by(session_id=session_id)
            .order_by(Message.created_at.asc())
            .all()
        )

        return {
            'session_id': session_id,
            'messages': [m.to_dict() for m in messages],
            'message_count': len(messages)
        }, 200

    except Exception as e:
        print(f"Error fetching history: {e}")
        return {'error': 'Failed to fetch chat history', 'details': str(e)}, 500


@chat_bp.route('/session', methods=['POST'])
@optional_token_required
def create_session():
    """Create a new chat session if it doesn't already exist."""
    try:
        data = request.get_json()

        if not data or not data.get('session_id'):
            return {'error': 'Session ID is required'}, 400

        session_id = data['session_id']

        existing = ChatSession.query.filter_by(session_id=session_id).first()
        if existing:
            return {'session': existing.to_dict()}, 200

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
    """List all chat sessions for the logged-in user."""
    try:
        if not request.user_id:
            return {'error': 'Not authenticated'}, 401

        sessions = (
            ChatSession.query
            .filter_by(user_id=request.user_id)
            .order_by(ChatSession.started_at.desc())
            .limit(50)
            .all()
        )

        return {
            'sessions': [s.to_dict() for s in sessions],
            'count': len(sessions)
        }, 200

    except Exception as e:
        print(f"Error fetching sessions: {e}")
        return {'error': 'Failed to fetch sessions', 'details': str(e)}, 500


@chat_bp.route('/unified-sessions', methods=['GET'])
@optional_token_required
def get_unified_sessions():
    """Return sessions with associated mood entries and previews."""
    try:
        if not request.user_id:
            return {'error': 'Not authenticated'}, 401

        sessions = ChatSession.query.filter_by(
            user_id=request.user_id
        ).order_by(ChatSession.started_at.desc()).limit(50).all()

        unified = []
        for session in sessions:
            data = session.to_dict()

            # Attach mood entry
            mood = MoodEntry.query.filter_by(session_id=session.id).first()
            data['mood_entry'] = mood.to_dict() if mood else None

            # Last message preview
            last = Message.query.filter_by(
                session_id=session.id
            ).order_by(Message.created_at.desc()).first()

            if last:
                text = last.text
                data['last_message_preview'] = (
                    text[:47] + "..." if len(text) > 50 else text
                )
            else:
                data['last_message_preview'] = "No messages yet"

            unified.append(data)

        return {'sessions': unified, 'count': len(unified)}, 200

    except Exception as e:
        print(f"Unified session error: {e}")
        return {'error': 'Failed to fetch unified sessions', 'details': str(e)}, 500


@chat_bp.route('/session/<int:session_id>', methods=['DELETE'])
@optional_token_required
def delete_session(session_id):
    """Delete a session and all related data."""
    try:
        session = ChatSession.query.get(session_id)

        if not session:
            return jsonify({'success': False, 'error': 'Session not found'}), 404

        current_user_id = getattr(request, 'user_id', None)

        # Convert to int safely
        try:
            user_id_int = int(current_user_id) if current_user_id else None
        except ValueError:
            return jsonify({'success': False, 'error': 'Invalid user ID'}), 400

        # Permission checks
        if user_id_int:
            if session.user_id not in (None, user_id_int):
                return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        else:
            if session.user_id is not None:
                return jsonify({'success': False, 'error': 'Login required'}), 401

        # Clear AI memory
        groq_service.clear_history(f"session_{session.id}")

        db.session.delete(session)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Session deleted successfully',
            'session_id': session_id
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Delete error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to delete session',
            'details': str(e)
        }), 500


@chat_bp.route('/statistics', methods=['GET'])
@optional_token_required
def get_session_statistics():
    """Return basic analytics for user sessions."""
    try:
        if not request.user_id:
            return {'error': 'Not authenticated'}, 401

        sessions = ChatSession.query.filter_by(user_id=request.user_id).all()

        total = len(sessions)
        message_sum = sum(s.message_count for s in sessions)

        with_mood = sum(
            1 for s in sessions
            if MoodEntry.query.filter_by(session_id=s.id).first()
        )

        avg_per_session = (message_sum / total) if total > 0 else 0

        return {
            'statistics': {
                'total_sessions': total,
                'total_messages': message_sum,
                'sessions_with_mood': with_mood,
                'average_messages_per_session': round(avg_per_session, 1),
                'mood_checkin_rate': round((with_mood / total * 100) if total else 0, 1)
            }
        }, 200

    except Exception as e:
        print(f"Statistics error: {e}")
        return {'error': 'Failed to fetch statistics', 'details': str(e)}, 500
