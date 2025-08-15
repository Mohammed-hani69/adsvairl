# Overview

This is a full-stack classified ads platform built with Flask (Python) backend and pure HTML/CSS/JavaScript frontend. The application allows users to browse, search, and post classified advertisements across various categories like real estate, cars, jobs, and electronics. It features a modern Arabic-first UI with RTL support, image uploads, admin moderation, and comprehensive search/filtering capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.
Backend: Flask (Python) - COMPLETED MIGRATION from Node.js/Express
Frontend: Pure HTML, CSS, JavaScript - COMPLETED MIGRATION from React
Technology stack: Flask + Jinja2 templates + vanilla JS + PostgreSQL
Architecture: Fully converted to Flask-based application (August 15, 2025)
Status: COMPLETED - All React/Node.js components removed, Flask running successfully on port 5000
AdSense Integration: COMPLETED - Full AdSense management system with remote dashboard (August 15, 2025)

# System Architecture

## Frontend Architecture
- **Framework**: Pure HTML5 with Jinja2 templating engine
- **Styling**: Bootstrap 5 + Custom CSS with Arabic-first design and RTL support
- **JavaScript**: Vanilla JavaScript with modern ES6+ features
- **UI Components**: Custom CSS components with Font Awesome icons
- **Forms**: Standard HTML forms with JavaScript validation and AJAX submission
- **Internationalization**: Arabic-first design with Cairo font family and RTL layout support

## Backend Architecture
- **Runtime**: Python 3.11 with Flask framework
- **Language**: Python with Flask-SQLAlchemy ORM
- **API Design**: RESTful API with Flask routes and JSON responses
- **File Uploads**: Werkzeug for handling image uploads with file type validation
- **Template Engine**: Jinja2 for server-side rendering
- **Development**: Flask development server with debug mode and auto-reload

## Data Storage Solutions
- **Database**: PostgreSQL with Flask-SQLAlchemy ORM
- **Schema**: Relational schema with users, categories, ads, countries, states, cities, and adsense_ad tables
- **Migrations**: Flask-SQLAlchemy migrations with schema evolution support
- **File Storage**: Local file system storage for uploaded images in uploads/ directory
- **AdSense Storage**: Database storage for ad unit configurations and placement settings

## Authentication and Authorization
- **Current State**: Temporary user system (placeholder implementation)
- **Admin Features**: Role-based access control with admin panel for ad moderation and AdSense management
- **Session Management**: Prepared for session-based authentication with connect-pg-simple for PostgreSQL sessions
- **AdSense Management**: Complete admin dashboard for managing ad placements remotely

## External Dependencies
- **Database**: Neon Database (PostgreSQL) for production data persistence
- **Font Resources**: Google Fonts for Cairo and other Arabic-compatible fonts
- **Icon Library**: Font Awesome for consistent iconography across categories
- **Image Processing**: Built-in browser APIs for image preview and validation
- **Development Tools**: Replit integration with error overlay and cartographer for development environment