#!/usr/bin/env python3
import os
import sys
from app import app, db

if __name__ == '__main__':
    # Set up environment
    os.environ.setdefault('FLASK_ENV', 'development')
    
    print("Starting Flask application...")
    print("Admin login: hanizezo5@gmail.com / zxc65432")
    print("Serving on http://localhost:3000")
    
    # Run the Flask app
    try:
        app.run(host='0.0.0.0', port=5000, debug=True)
    except Exception as e:
        print(f"Error starting Flask app: {e}")
        sys.exit(1)