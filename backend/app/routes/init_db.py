from flask import Blueprint, jsonify, current_app
from app.models import db # Import the db object

# Define the blueprint
init_bp = Blueprint('init_bp', __name__)

@init_bp.route('/init-db', methods=['POST'])
def initialize_database():
    """Initializes the database tables on the deployed server."""
    try:
        # Use current_app.app_context() to ensure db operation is valid
        with current_app.app_context():
            db.create_all()
        return jsonify({"message": "Database tables initialized successfully"}), 200
    except Exception as e:
        # Log error in case of database connection failure
        print(f"Database Initialization Error: {e}")
        return jsonify({"error": "Failed to initialize database tables", "details": str(e)}), 500

@init_bp.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint."""
    return jsonify({"status": "ok"}), 200