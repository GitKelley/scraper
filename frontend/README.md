# Rental Scraper Frontend

A modern, responsive frontend for displaying rental options in a Notion-style interface.

## Features

- **Notion-style Design**: Clean, modern interface inspired by Notion
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile devices
- **Interactive Components**: 
  - Tab navigation (Lodging Options, Activity Planning, Vote Results)
  - Lodging cards with images, prices, and upvote functionality
  - Live countdown timer
  - Trip details sidebar
- **Real-time Updates**: Fetches data from the scraper API backend

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3001`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Header.jsx          # Top header with title and banner
│   │   ├── NavigationTabs.jsx  # Tab navigation component
│   │   ├── LodgingGrid.jsx     # Grid container for lodging cards
│   │   ├── LodgingCard.jsx     # Individual lodging card component
│   │   └── Sidebar.jsx         # Sidebar with trip details and countdown
│   ├── App.jsx                 # Main app component
│   ├── App.css                 # App styles
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles
├── index.html                  # HTML template
├── package.json                # Dependencies and scripts
└── vite.config.js             # Vite configuration
```

## API Integration

The frontend expects lodging data in the following format:

```json
[
  {
    "id": "unique-id",
    "title": "Property Title",
    "image": "https://example.com/image.jpg",
    "price": 1500,
    "source": "VRBO",
    "bedrooms": 5,
    "bathrooms": 3,
    "sleeps": 14,
    "location": "City, State"
  }
]
```

The frontend will fetch data from `/api/lodging-options` endpoint.

## Customization

### Styling

All styles use CSS variables defined in `src/index.css`. You can customize:

- Colors: `--bg-primary`, `--text-primary`, `--accent-blue`, etc.
- Spacing: Adjust padding and margins in component CSS files
- Typography: Modify font sizes and weights in component CSS files

### Trip Dates

Update the target date in `src/components/Sidebar.jsx`:

```javascript
const targetDate = new Date('2025-12-30T00:00:00');
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT

