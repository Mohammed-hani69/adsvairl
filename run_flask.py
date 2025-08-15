#!/usr/bin/env python3
import os
from app import app

if __name__ == '__main__':
    # Set up environment
    os.environ.setdefault('FLASK_ENV', 'development')
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)