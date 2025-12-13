from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from app.models import db, MoodEntry, ChatSession
from app.services.groq_service import GroqService
from app.utils.auth import optional_token_required, token_required

mood_bp = Blueprint('mood', __name__)
groq_service = GroqService()


@mood_bp.route('/check-in', methods=['POST'])
@optional_token_required
def create_mood_entry():
    """Create a mood check-in entry"""
    try:
        data = request.get_json()
        
        # Validation
        if not data or not data.get('session_id') or 'intensity' not in data:
            return {'error': 'Session ID and intensity are required'}, 400
        
        # Check if we have either mood or emotions
        if not data.get('mood') and not data.get('emotions'):
            return {'error': 'Either mood or emotions are required'}, 400
        
        session_id = data['session_id']
        intensity = data['intensity']
        note = data.get('note', '')
        
        # Handle mood and emotions
        mood_value = ''
        emotions_value = ''
        
        # Get emotions from either emotions array or mood string
        if data.get('emotions') and isinstance(data['emotions'], list):
            emotions = data['emotions']
            # Store emotions as comma-separated string
            emotions_value = ','.join(emotions)
            # For mood field, store first 3 emotions or a summary
            if len(emotions) == 1:
                mood_value = emotions[0]
            elif len(emotions) <= 3:
                mood_value = ','.join(emotions)
            else:
                mood_value = f"{emotions[0]},{emotions[1]},+{len(emotions)-2}"
        elif data.get('mood'):
            # Legacy support for single mood string
            mood_value = data['mood']
            emotions_value = data['mood']  # Store as emotions too for consistency
        
        tags = ','.join(data.get('tags', [])) if isinstance(data.get('tags'), list) else data.get('tags', '')
        
        # Validate mood (if provided)
        if mood_value and ',' in mood_value:
            # Split and validate each mood
            moods = [m.strip() for m in mood_value.split(',') if m.strip()]
            for m in moods:
                # Skip validation for "+X" summary entries
                if not m.startswith('+') and m not in MoodEntry.VALID_MOODS:
                    return {'error': f'Invalid mood "{m}". Must be one of: {", ".join(MoodEntry.VALID_MOODS)}'}, 400
        elif mood_value and not mood_value.startswith('+'):
            # Single mood validation
            if mood_value not in MoodEntry.VALID_MOODS:
                return {'error': f'Invalid mood. Must be one of: {", ".join(MoodEntry.VALID_MOODS)}'}, 400
        
        # Validate intensity
        if not isinstance(intensity, int) or intensity < 1 or intensity > 10:
            return {'error': 'Intensity must be between 1 and 10'}, 400
        
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
        
        # Create mood entry
        mood_entry = MoodEntry(
            session_id=chat_session.id,
            user_id=request.user_id,
            mood=mood_value[:255],  # Truncate to 255 characters to avoid database errors
            intensity=intensity,
            note=note,
            emotions=emotions_value[:500],  # Truncate emotions field too
            tags=tags
        )
        db.session.add(mood_entry)
        
        # Update session mood entry count
        chat_session.mood_entry_count += 1
        db.session.commit()
        
        return {
            'message': 'Mood entry created successfully',
            'mood_entry': mood_entry.to_dict()
        }, 201
    
    except Exception as e:
        db.session.rollback()
        print(f"Error creating mood entry: {e}")
        return {'error': 'Failed to create mood entry', 'details': str(e)}, 500


@mood_bp.route('/entry/<int:entry_id>', methods=['PUT'])
@optional_token_required
def update_mood_entry(entry_id):
    """Update an existing mood entry"""
    try:
        data = request.get_json()
        
        # Find the mood entry
        mood_entry = MoodEntry.query.get(entry_id)
        
        if not mood_entry:
            return {'error': 'Mood entry not found'}, 404
        
        # Validate ownership if user is authenticated
        if request.user_id and mood_entry.user_id != request.user_id:
            return {'error': 'Unauthorized to update this mood entry'}, 403
        
        # Update fields if provided
        if 'mood' in data:
            if data['mood'] not in MoodEntry.VALID_MOODS:
                return {'error': f'Invalid mood. Must be one of: {", ".join(MoodEntry.VALID_MOODS)}'}, 400
            mood_entry.mood = data['mood']
        
        if 'intensity' in data:
            if not isinstance(data['intensity'], int) or data['intensity'] < 1 or data['intensity'] > 10:
                return {'error': 'Intensity must be between 1 and 10'}, 400
            mood_entry.intensity = data['intensity']
        
        if 'note' in data:
            mood_entry.note = data['note']
        
        if 'emotions' in data:
            mood_entry.emotions = ','.join(data['emotions']) if isinstance(data['emotions'], list) else data['emotions']
        
        if 'tags' in data:
            mood_entry.tags = ','.join(data['tags']) if isinstance(data['tags'], list) else data['tags']
        
        db.session.commit()
        
        return {
            'message': 'Mood entry updated successfully',
            'mood_entry': mood_entry.to_dict()
        }, 200
    
    except Exception as e:
        db.session.rollback()
        print(f"Error updating mood entry: {e}")
        return {'error': 'Failed to update mood entry', 'details': str(e)}, 500


@mood_bp.route('/session/<session_id>/entry', methods=['GET'])
@optional_token_required
def get_session_mood_entry(session_id):
    """Get mood entry for a specific session"""
    try:
        # Get the chat session
        chat_session = ChatSession.query.filter_by(session_id=session_id).first()
        
        if not chat_session:
            return {'mood_entry': None}, 200
        
        # Get the mood entry for this session
        mood_entry = MoodEntry.query.filter_by(session_id=chat_session.id).first()
        
        if not mood_entry:
            return {'mood_entry': None}, 200
        
        entry_dict = mood_entry.to_dict()
        # Add session_id string for frontend
        entry_dict['session_id_string'] = chat_session.session_id
        
        return {
            'mood_entry': entry_dict
        }, 200
    
    except Exception as e:
        print(f"Error fetching session mood entry: {e}")
        return {'error': 'Failed to fetch mood entry', 'details': str(e)}, 500


@mood_bp.route('/user/history', methods=['GET'])
@token_required
def get_user_mood_history():
    """Get all mood entries for the authenticated user"""
    try:
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        
        # Get all mood entries for this user, ordered by most recent
        mood_entries = MoodEntry.query.filter_by(
            user_id=request.user_id
        ).order_by(MoodEntry.created_at.desc()).offset(offset).limit(limit).all()
        
        total = MoodEntry.query.filter_by(user_id=request.user_id).count()
        
        # Convert to dict and add session_id string for frontend
        mood_data = []
        for entry in mood_entries:
            entry_dict = entry.to_dict()
            # Get the session_id string from the ChatSession
            session = ChatSession.query.get(entry.session_id)
            if session:
                entry_dict['session_id_string'] = session.session_id
            mood_data.append(entry_dict)
        
        return {
            'mood_history': mood_data,
            'total': total,
            'count': len(mood_entries)
        }, 200
    
    except Exception as e:
        print(f"Error fetching user mood history: {e}")
        return {'error': 'Failed to fetch mood history', 'details': str(e)}, 500


@mood_bp.route('/history/<int:session_id>', methods=['GET'])
def get_mood_history(session_id):
    """Get mood history for a session or user"""
    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        mood_entries = MoodEntry.query.filter_by(
            session_id=session_id
        ).order_by(MoodEntry.created_at.desc()).offset(offset).limit(limit).all()
        
        total = MoodEntry.query.filter_by(session_id=session_id).count()
        
        return {
            'mood_history': [entry.to_dict() for entry in mood_entries],
            'total': total,
            'count': len(mood_entries)
        }, 200
    
    except Exception as e:
        print(f"Error fetching mood history: {e}")
        return {'error': 'Failed to fetch mood history', 'details': str(e)}, 500


@mood_bp.route('/entry/<int:entry_id>', methods=['GET'])
def get_mood_entry(entry_id):
    """Get a specific mood entry"""
    try:
        mood_entry = MoodEntry.query.get(entry_id)
        
        if not mood_entry:
            return {'error': 'Mood entry not found'}, 404
        
        return {'mood_entry': mood_entry.to_dict()}, 200
    
    except Exception as e:
        print(f"Error fetching mood entry: {e}")
        return {'error': 'Failed to fetch mood entry', 'details': str(e)}, 500


@mood_bp.route('/statistics', methods=['GET'])
@token_required
def get_mood_statistics():
    """Get mood statistics for user"""
    try:
        days = int(request.args.get('days', 30))
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get mood entries for the time period
        entries = MoodEntry.query.filter(
            MoodEntry.user_id == request.user_id,
            MoodEntry.created_at >= start_date
        ).order_by(MoodEntry.created_at.desc()).all()
        
        # Calculate statistics
        mood_counts = {}
        total_intensity = 0
        
        for entry in entries:
            mood = entry.mood
            mood_counts[mood] = mood_counts.get(mood, 0) + 1
            total_intensity += entry.intensity
        
        average_intensity = total_intensity / len(entries) if entries else 0
        dominant_mood = max(mood_counts, key=mood_counts.get) if mood_counts else 'No data'
        
        return {
            'statistics': {
                'total_entries': len(entries),
                'average_intensity': round(average_intensity, 2),
                'dominant_mood': dominant_mood,
                'mood_distribution': mood_counts,
                'period': f'Last {days} days'
            }
        }, 200
    
    except Exception as e:
        print(f"Error fetching mood statistics: {e}")
        return {'error': 'Failed to fetch mood statistics', 'details': str(e)}, 500


@mood_bp.route('/recommendation', methods=['GET'])
@token_required
def get_wellness_recommendation():
    """Get wellness recommendation based on mood history"""
    try:
        # Get recent mood history
        recent_moods = MoodEntry.query.filter_by(
            user_id=request.user_id
        ).order_by(MoodEntry.created_at.desc()).limit(10).all()
        
        # Extract mood data
        mood_history = [
            {
                'mood': m.mood,
                'intensity': m.intensity,
                'timestamp': m.created_at
            }
            for m in recent_moods
        ]
        
        # Generate recommendation using Gemini
        recommendation = groq_service.generate_wellness_recommendation(mood_history)
        
        return {
            'recommendation': recommendation,
            'based_on_entries': len(recent_moods)
        }, 200
    
    except Exception as e:
        print(f"Error generating recommendation: {e}")
        return {'error': 'Failed to generate recommendation', 'details': str(e)}, 500


@mood_bp.route('/entry/<int:entry_id>', methods=['DELETE'])
def delete_mood_entry(entry_id):
    """Delete a mood entry"""
    try:
        mood_entry = MoodEntry.query.get(entry_id)
        
        if not mood_entry:
            return {'error': 'Mood entry not found'}, 404
        
        # Get the session to update mood_entry_count
        chat_session = ChatSession.query.get(mood_entry.session_id)
        if chat_session and chat_session.mood_entry_count > 0:
            chat_session.mood_entry_count -= 1
        
        db.session.delete(mood_entry)
        db.session.commit()
        
        return {'message': 'Mood entry deleted successfully'}, 200
    
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting mood entry: {e}")
        return {'error': 'Failed to delete mood entry', 'details': str(e)}, 500
    
@mood_bp.route('/session/<session_id>/entries', methods=['GET'])
@optional_token_required
def get_session_mood_entries(session_id):
    """Get ALL mood entries for a specific session"""
    try:
        # Get the chat session
        chat_session = ChatSession.query.filter_by(session_id=session_id).first()
        
        if not chat_session:
            return {'mood_entries': [], 'count': 0}, 200
        
        # Get ALL mood entries for this session, ordered by most recent
        mood_entries = MoodEntry.query.filter_by(
            session_id=chat_session.id
        ).order_by(MoodEntry.created_at.desc()).all()
        
        # Convert to dict with session_id_string
        mood_data = []
        for entry in mood_entries:
            entry_dict = entry.to_dict()
            entry_dict['session_id_string'] = chat_session.session_id
            mood_data.append(entry_dict)
        
        return {
            'mood_entries': mood_data,
            'count': len(mood_entries)
        }, 200
    
    except Exception as e:
        print(f"Error fetching session mood entries: {e}")
        return {'error': 'Failed to fetch mood entries', 'details': str(e)}, 500    