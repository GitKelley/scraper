# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2025-01-XX

### ✨ Features Added

#### Multi-Step Wizard Forms
- **Rental Form Wizard**: Converted the rental creation form into a 4-step wizard
  - Step 1: Basic Information (Title, Source, URL)
  - Step 2: Property Details (Bedrooms, Bathrooms, Sleeps, Location)
  - Step 3: Pricing & Images (Price, Image uploads)
  - Step 4: Description (Final details)
  
- **Activity Form Wizard**: Converted the activity creation form into a 4-step wizard
  - Step 1: Basic Information (Title, Category, Description)
  - Step 2: Activity Details (Cost, Duration, Best Time, Difficulty, Group Size, Booking Required, Location)
  - Step 3: Contact & Images (Website URL, Contact info, Images)
  - Step 4: Additional Notes (Why you're suggesting this activity)

- **Wizard Component**: Created a reusable wizard component with:
  - Visual progress indicator showing current step
  - Step completion tracking (checkmarks for completed steps)
  - Previous/Next navigation buttons
  - Step counter display
  - Responsive design for mobile devices

#### Toast Notification System Improvements
- Added toast deduplication to prevent duplicate notifications
- Limited maximum concurrent toasts to 3
- Removed "Vote recorded!" toasts (UI updates optimistically, so toasts aren't needed)
- Improved toast positioning and styling
- Better mobile support with toast positioning above FAB

#### Voting System Enhancements
- Integrated vote visualization directly into rental cards on voting results page
- Single unified card design showing upvotes, downvotes, net votes, and progress bars
- Removed separate vote summary section for cleaner UI
- Fixed animation glitches on voting results page

### 🐛 Bug Fixes

- **Sidebar Toggle Arrow**: Fixed wonky Unicode arrow characters by replacing with clean SVG icon
  - Arrow now properly rotates when sidebar is collapsed/expanded
  - Consistent rendering across all browsers and devices
  
- **Toast Stacking**: Fixed issue where quickly voting on multiple items would stack up toast notifications
  - Implemented debounce mechanism (500ms) to prevent duplicate toasts
  - Limited maximum toasts displayed at once
  
- **Voting Results Animation**: Fixed animation overlap issue where card bottom overlapped voting portion
  - Integrated all vote indicators into single card component
  - Improved animation timing and delays

### 🎨 UI/UX Improvements

#### Form Experience
- Reduced modal size by breaking forms into logical steps
- Added clear stopping points with step titles and descriptions
- Improved form navigation with Previous/Next buttons
- Better visual feedback with progress indicators

#### Visual Design
- Modern wizard progress indicator with step numbers and completion checkmarks
- Clean SVG icons replacing Unicode characters for better consistency
- Improved spacing and layout in wizard steps
- Better mobile responsiveness for all form elements

#### User Feedback
- Removed unnecessary toast notifications for voting (UI already shows updated counts)
- Improved error handling with better toast messages
- Clearer visual hierarchy in multi-step forms

### 🔧 Technical Improvements

- Created reusable `Wizard` component for future form implementations
- Improved component structure and separation of concerns
- Better CSS organization with wizard-specific styles
- Enhanced accessibility with proper ARIA labels and keyboard navigation

### 📱 Mobile Improvements

- Wizard forms optimized for mobile devices
- Responsive step indicators that adapt to screen size
- Touch-friendly navigation buttons
- Improved scrolling behavior in modals

---

## Previous Updates

### Recent Features (from earlier sessions)

- **Floating Action Button (FAB)**: Single source of truth for adding new rentals/activities
- **Filter & Sort Bar**: Added filtering and sorting capabilities to rental and activity grids
- **Skeleton Loaders**: Improved loading states with skeleton placeholders
- **Toast Notifications**: Comprehensive toast system for user feedback
- **Empty States**: Enhanced empty states with icons and helpful messages
- **Vote Toggle**: Users can remove their vote by clicking the same button again
- **Optimistic UI Updates**: Vote counts update immediately without page refresh
- **Sidebar Widgets**: Added weather widget and Google Maps for Asheville, NC
- **Modern Header Redesign**: FAANG-style header with user avatar and dropdown menus
- **Theme Toggle**: Animated theme switcher with sun/moon icons
- **Accessibility Improvements**: Added ARIA labels, keyboard shortcuts, focus-visible styles
- **Mobile-First Design**: Collapsible sidebar, improved touch targets, responsive layouts

### Recent Bug Fixes (from earlier sessions)

- Fixed modal closing when clicking and dragging inside
- Fixed dropdown arrow highlighting on hover
- Fixed number input spinner highlighting
- Fixed sort dropdown colors in dark mode
- Fixed toast positioning and colors
- Fixed vote button counts not updating
- Fixed activity modal not opening correctly
- Fixed cost dropdown alignment in activity form
- Fixed card size consistency on voting results page
- Fixed URL parsing for "add by URL" feature
- Fixed cancel button not working during import failures
- Fixed light mode widget visibility issues

---

## Notes

- All changes maintain backward compatibility
- Database schema remains unchanged
- No breaking changes to API endpoints
- All improvements are mobile-first and responsive

