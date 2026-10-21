# Student Attendance Management System

A web-based Student Attendance Management System with separate Admin and Student portals, designed to simplify attendance tracking and student record management.

## Features

- Separate Admin and Student portals
- Student record management
- Attendance tracking and viewing
- JSON-based data storage
- Automatic dummy data seeding
- Responsive user interface

## Tech Stack

- **Frontend:** React, Vite
- **Backend:** Node.js, Express.js
- **Storage:** JSON files
- **Authentication:** bcrypt (if configured)

## Getting Started

### Prerequisites

- Node.js and npm installed

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/nikhilsharma0519/student-attendance-system.git
   ```

2. Navigate to the project directory:

   ```bash
   cd student-attendance-system
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Run the setup script, if configured:

   ```bash
   npm run setup
   ```

5. Start the application using the script configured in `package.json`:

   ```bash
   npm run dev
   ```

## Data Storage

The application uses JSON files for storing application data instead of a database. This approach is suitable for development and demonstration purposes.

## Future Improvements

- Database integration
- Attendance reports and analytics
- Improved authentication and authorization
- Deployment to a hosting platform

## Disclaimer

This project is intended for learning and demonstration purposes. Use secure authentication and appropriate data storage before deploying it for real student records.
