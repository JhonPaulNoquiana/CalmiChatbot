import os
from app import create_app

app = create_app(os.getenv('FLASK_ENV', 'development'))

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    
    print(f"""
╔══════════════════════════════╗
║     Calmi Backend Server     ║
╠══════════════════════════════╣
 Server running on port: {port:<21} 
 Environment: {os.getenv('FLASK_ENV', 'development'):<25} 
 CORS Origin: {os.getenv('CORS_ORIGIN', 'http://localhost:5173'):<20} 
    """)
    
    app.run(host='0.0.0.0', port=port, debug=debug)