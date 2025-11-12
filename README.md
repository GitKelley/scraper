# Kelley 2026 New Years Trip - Trip Planning App

A modern, collaborative trip planning web application for managing rental listings and activities. Built with React, Node.js, Express, and SQLite.

## Features

### 🏠 Rental Management
- **Import from URL**: Automatically scrape rental details from VRBO or Airbnb links
- **Manual Entry**: Create rental listings from scratch with full control
- **Image Management**: Upload images or view scraped images
- **Voting System**: Upvote/downvote rentals to help the group decide
- **Comments**: Add and view comments on each rental
- **Delete**: Remove rentals you no longer need

### 🎯 Activity Planning
- **Manual Entry**: Add activities with details like cost, duration, location, difficulty, etc.
- **Voting System**: Vote on activities to prioritize
- **Comments**: Discuss activities with your group
- **Delete**: Remove activities from consideration

### 📊 Voting Results
- View all rentals and activities sorted by net votes
- See which options are most popular with your group

### 👥 User Authentication
- Simple username/password authentication
- Session persistence (stays logged in across visits)
- User-specific voting and comments

### 🎨 Modern UI
- Dark/Light mode toggle
- Responsive design (works on mobile and desktop)
- Image viewer for browsing rental photos
- Glassmorphic design with smooth animations

### 📍 Location Features
- Weather widget for Asheville, NC
- Google Maps embed showing Asheville area
- Countdown timer to trip date

## Prerequisites

- Node.js 20+ 
- npm or yarn
- Firecrawl API key (for rental scraping)
- OpenWeatherMap API key (optional, for weather widget)

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/GitKelley/scraper.git
cd scraper
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
PORT=3000
NODE_ENV=development
```

For the frontend, create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_OPENWEATHER_API_KEY=your_weather_api_key_here
```

### 5. Import Header Image (Optional)

If you want to use a custom header image on the landing page:

1. Place your image file in the `src/` directory (name it `header-image.jpg`, `header-image.png`, etc.)
2. Run the import script:

```bash
node src/import-header-image.js
```

## Running Locally

### Start Backend Server

```bash
npm start
```

The backend will run on `http://localhost:3000`

### Start Frontend Development Server

In a separate terminal:

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:5173` (or another port if 5173 is busy)

## How to Use the App

### First Time Setup

1. **Visit the Landing Page**: When you first open the app, you'll see the landing page
2. **Sign Up**: Click "Sign Up" to create an account
   - Enter a username, password, and your name
   - No email verification required
3. **Log In**: After signing up, you'll be automatically logged in

### Adding Rentals

#### Option 1: Import from URL

1. Click "Add Property" or navigate to "Lodging Options" tab
2. Click "Add New Rental"
3. Choose "Import from URL"
4. Paste a VRBO or Airbnb link
5. Click "Import Rental"
6. The app will automatically scrape:
   - Title
   - Price
   - Bedrooms, bathrooms, sleeps
   - Location
   - Description
   - Images
   - Amenities

#### Option 2: Create from Scratch

1. Click "Add Property" or navigate to "Lodging Options" tab
2. Click "Add New Rental"
3. Choose "Create from Scratch"
4. Fill in all the details manually:
   - Title
   - URL (optional)
   - Description
   - Price
   - Bedrooms, bathrooms, sleeps
   - Location
   - Images (upload from your device)
   - Amenities
5. Click "Save Rental"

### Adding Activities

1. Navigate to "Activity Planning" tab
2. Click "Add Activity"
3. Fill in activity details:
   - Title (required)
   - Description
   - Location
   - Category
   - Cost
   - Duration
   - Best time to visit
   - Difficulty level
   - Group size
   - Whether booking is required
   - Contact information
   - Notes
   - Images (upload from your device)
4. Click "Save Activity"

### Viewing and Interacting with Items

1. **View Details**: Click on any rental or activity card to open the detail modal
2. **Vote**: Click the upvote (↑) or downvote (↓) buttons
   - You can change your vote, but can't vote multiple times
3. **Add Comments**: Scroll to the comments section and type your comment
4. **View Images**: 
   - Click on any image thumbnail to open the image viewer
   - Navigate through all images with arrow buttons
5. **Delete**: Click the trash icon (🗑️) in the top-right of the modal
   - You'll be asked to confirm before deleting

### Viewing Voting Results

1. Navigate to the "All Voting Results" tab
2. See all rentals and activities sorted by popularity (net votes)
3. Hover over items to see more details
4. Click on items to view full details

### Settings

1. Click the settings icon (⚙️) in the top-right corner
2. Toggle between Dark and Light mode
3. Your preference is saved automatically

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create a new user account
- `POST /api/auth/login` - Log in with username and password

### Rentals
- `GET /api/lodging-options` - Get all rentals
- `GET /api/lodging-options/:id` - Get a specific rental
- `POST /api/scrape-rental` - Scrape and save a rental from URL
- `PUT /api/lodging-options/:id` - Update a rental
- `POST /api/lodging-options/:id/vote` - Vote on a rental
- `DELETE /api/rentals/:id` - Delete a rental

### Activities
- `GET /api/activities` - Get all activities
- `GET /api/activities/:id` - Get a specific activity
- `POST /api/activities` - Create a new activity
- `PUT /api/activities/:id` - Update an activity
- `POST /api/activities/:id/vote` - Vote on an activity
- `DELETE /api/activities/:id` - Delete an activity

### Voting
- `GET /api/voting-results` - Get all voting results (rentals and activities)

### Comments
- `GET /api/comments/:itemId/:itemType` - Get comments for an item
- `POST /api/comments` - Add a comment
- `DELETE /api/comments/:commentId` - Delete a comment

### Settings
- `GET /api/settings/header-image` - Get the header image

## Deployment

### Deploying to Render

**Important**: `render.yaml` is only used if you deploy via **Render Blueprint** (Infrastructure as Code). If you created your service manually through the dashboard, `render.yaml` is ignored and you must configure everything through the dashboard.

1. **Connect Repository**: 
   - Go to [render.com](https://render.com)
   - Connect your GitHub repository

2. **Create Web Service** (Manual Setup):
   - Click "New +" → "Web Service"
   - Select your repository
   - Configure:
     - **Name**: `scraper` (or your preferred name)
     - **Environment**: `Node`
     - **Build Command**: `npm run render-build`
     - **Start Command**: `npm start`
     - **Plan**: Starter (or higher for persistent disk)

3. **Set Environment Variables** in Render dashboard:
   - Go to your service → "Environment" tab
   - Add these variables:
     - `NODE_ENV` = `production`
     - `PORT` = `3000` (Render sets this automatically, but you can override)
     - `RENDER` = `true` (helps app detect it's on Render - **important for disk detection**)
     - `FIRECRAWL_API_KEY` = Your Firecrawl API key
     - `VITE_API_URL` = Your Render service URL (e.g., `https://your-app.onrender.com`)
     - `VITE_OPENWEATHER_API_KEY` = Your OpenWeatherMap API key (optional)

4. **Deploy**: Render will automatically build and deploy on every push

**Note**: If you're using Render Blueprint, the `render.yaml` file will be used automatically. Otherwise, configure everything through the dashboard as described above.

### Build Process

The build process:
1. Installs backend dependencies
2. Rebuilds `better-sqlite3` for Node.js 20
3. Installs frontend dependencies
4. Builds the React frontend
5. Starts the Express server (serves both API and frontend)

## Project Structure

```
scraper/
├── server.js              # Express API server
├── package.json          # Backend dependencies
├── render.yaml           # Render deployment config
├── .nvmrc                # Node.js version (20)
├── src/
│   ├── scraper.js        # Rental scraping logic (Firecrawl)
│   ├── database.js       # SQLite database setup
│   ├── storage.js        # Database operations
│   ├── auth.js           # User authentication
│   └── import-header-image.js  # Script to import header image
├── frontend/
│   ├── package.json      # Frontend dependencies
│   ├── vite.config.js    # Vite configuration
│   ├── index.html        # HTML entry point
│   └── src/
│       ├── App.jsx       # Main app component
│       ├── main.jsx      # React entry point
│       ├── components/  # React components
│       └── contexts/    # React contexts (Theme)
└── data.db               # SQLite database (created automatically)
```

## Supported Rental Websites

The scraper supports:
- **VRBO** - Full support for scraping listings
- **Airbnb** - Full support (may require retries due to anti-bot measures)
- Other sites may work but are not specifically tested

## Troubleshooting

### Rental Import Not Working

- **VRBO/Airbnb blocking**: The scraper uses Firecrawl with stealth mode and retry logic. If it still fails, use "Create from Scratch" instead
- **403 errors**: Firecrawl may be rate-limited. Wait a few hours and try again
- **Timeout errors**: Some listings take longer to scrape. The scraper will retry automatically

### Images Not Showing

- Check that images are valid URLs or base64 data
- For uploaded images, ensure they're valid image files
- Check browser console for errors

### Database Issues

- The database is created automatically on first run
- If you need to reset: delete `data.db` and restart the server
- All data will be lost when resetting

### Weather Widget Not Working

- Ensure `VITE_OPENWEATHER_API_KEY` is set in environment variables
- The widget will show fallback data if the API key is missing
- Get a free API key from [OpenWeatherMap](https://openweathermap.org/api)

### Data Persistence on Render

**Important**: By default, Render uses an ephemeral filesystem, which means your SQLite database will be **erased on every redeploy**.

**Free Tier Limitations:**
- Render's free tier does NOT persist data across redeploys
- Persistent disks require a paid plan (~$0.30/GB/month minimum)
- Free PostgreSQL databases expire after 30 days

**Options for Free Users:**

#### Option 1: Accept Data Loss (Simplest)
- Data will be lost on redeploys, but the app will work fine
- Good for temporary trip planning where you can re-add items if needed
- No cost, no setup required

#### Option 2: Manual Backup Before Redeploys
1. Before redeploying, download your `data.db` file from Render (if accessible)
2. After redeploy, upload it back to the same location
3. This requires manual intervention but is free

#### Option 3: Use Render Persistent Disk (Paid)
1. Upgrade to a paid Render plan (Starter or higher)
2. Follow the detailed instructions in [DISK_SETUP.md](./DISK_SETUP.md)
3. Quick steps:
   - Go to your service → "Disks" section
   - Click "Add Disk"
   - Set **Mount Path**: `/opt/render/project/persistent` (must be exact!)
   - Set **Size**: 1GB (or more)
   - Save and redeploy

The app will automatically detect the persistent disk and store the database there. Check logs for: `✅ Using persistent disk at: /opt/render/project/persistent/data.db`

**Note**: For a temporary trip planning app, Option 1 (accepting data loss) is often the most practical choice.

### Deployment Issues

- **Build fails**: Check that Node.js 20+ is being used
- **Frontend not loading**: Ensure `VITE_API_URL` is set correctly
- **Database errors**: Make sure `better-sqlite3` is rebuilt for Node.js 20
- **Data lost on redeploy**: Set up a persistent disk (see above)

## Technology Stack

- **Frontend**: React 18, Vite, CSS3
- **Backend**: Node.js, Express
- **Database**: SQLite (better-sqlite3)
- **Scraping**: Firecrawl API
- **Authentication**: bcrypt for password hashing
- **Deployment**: Render.com

## License

MIT
