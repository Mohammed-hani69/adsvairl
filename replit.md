# Overview

This is a full-stack classified ads platform built with React, Express, and TypeScript. The application allows users to browse, search, and post classified advertisements across various categories like real estate, cars, jobs, and electronics. It features a modern Arabic-first UI with RTL support, image uploads, admin moderation, and comprehensive search/filtering capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.
Backend preference: Flask (Python) instead of Node.js/Express
Frontend preference: Pure HTML, CSS, JavaScript instead of React
Technology stack: Flask + Jinja2 templates + vanilla JS + PostgreSQL

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling and development
- **Routing**: Wouter for client-side routing with pages for home, ad details, category views, and admin panel
- **UI Components**: Shadcn/ui component library with Radix UI primitives for accessible components
- **Styling**: Tailwind CSS with custom CSS variables for theming and RTL (right-to-left) language support
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Internationalization**: Arabic-first design with Cairo font family and RTL layout support

## Backend Architecture
- **Runtime**: Node.js with Express framework
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful API with structured route handling and error middleware
- **File Uploads**: Multer middleware for handling image uploads with file type validation
- **Storage Layer**: Abstracted storage interface with in-memory implementation (designed to be swapped with database)
- **Development**: Hot reloading with Vite integration and request logging middleware

## Data Storage Solutions
- **Database**: Drizzle ORM configured for PostgreSQL with Neon Database serverless driver
- **Schema**: Relational schema with users, categories, and ads tables with proper foreign key relationships
- **Migrations**: Drizzle migrations with schema evolution support
- **File Storage**: Local file system storage for uploaded images with configurable upload directory

## Authentication and Authorization
- **Current State**: Temporary user system (placeholder implementation)
- **Admin Features**: Role-based access control with admin panel for ad moderation
- **Session Management**: Prepared for session-based authentication with connect-pg-simple for PostgreSQL sessions

## External Dependencies
- **Database**: Neon Database (PostgreSQL) for production data persistence
- **Font Resources**: Google Fonts for Cairo and other Arabic-compatible fonts
- **Icon Library**: Font Awesome for consistent iconography across categories
- **Image Processing**: Built-in browser APIs for image preview and validation
- **Development Tools**: Replit integration with error overlay and cartographer for development environment