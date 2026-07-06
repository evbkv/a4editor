# A4 Editor

A4 Editor is a minimalistic Progressive Web App text editor designed to simulate a clean A4 sheet of paper for writing notes and long-form text. The application focuses on readability, accessibility, and distraction-free writing, inspired by tools such as iA Writer and Calmly Writer.

The editor is built for people who value simplicity, visual harmony, and comfort during long writing sessions, including writers, journalists, and minimalists.

## Demo

[Online version](https://a4editor.evbkv.com/)

The application can be used directly in the browser or installed as a PWA on desktop and mobile devices. An Android APK is also included in the repository.

## Project Philosophy & Origin

A4 Editor was created to solve a very personal problem: the lack of a truly distraction-free writing environment.

The name **A4 Editor** reflects its core concept — a digital equivalent of a blank A4 sheet of paper, familiar to anyone who writes. The goal is simple: remove everything that does not serve the text.

While applications like **iA Writer** and **Calmly Writer** influenced this project, A4 Editor follows a different philosophy. It deliberately does not include paragraph focus mode. In practice, such modes can disrupt the flow of thought by isolating text fragments instead of preserving the integrity of the whole document.

This editor was built primarily:
- for my own note-taking during work and conferences,
- and for my wife, a writer who needs a calm and predictable writing space.

Classic tools like Windows Notepad feel outdated and visually uncomfortable, while many modern editors overload the user with formatting options and UI elements. One of the strongest inspirations came from the focus mode in Apple Pages on an old iBook PowerPC.

My interest in minimalist editors goes back to my first computer — the **Apogey BK-01**. One of the first programs I ever wrote was a simple text editor in machine code. It was fast, responsive, and free from unnecessary complexity — qualities that still define A4 Editor today.

Special attention is paid to accessibility, eye comfort, font choice, and layout proportions. The editor uses the golden ratio to create a balanced text area, making long writing sessions less tiring.

A4 Editor is designed for writers, thinkers, and minimalists — and may eventually evolve through integration with professional writing platforms.

## Key Features

* Progressive Web App with offline support
* Client-side text storage using localStorage
* Automatic saving every minute and on visibility change
* Manual save by tapping the red marker
* Export notes to plain text files (.txt)
* Five color themes (White, Light, Sepia, Dark, Black)
* Five font families (IBM Plex Mono, Sans, Serif, Courier Prime, Caveat)
* Three font sizes (Small, Medium, Large)
* Responsive layout for desktop, tablet, and mobile
* Keyboard shortcuts for common actions (Ctrl+S, Ctrl+E)
* Integrated AI assistant powered by DeepSeek (optional API key)
* Custom prompt templates for AI actions
* A‑Z navigation: double-click/long‑press marker to open menu, single-click to save or open AI
* Back gesture support (popstate) on mobile for closing overlays
* Anonymous usage analytics (optional, no personal data collected)
* Admin dashboard to view aggregated statistics (DAU, MAU, event types, etc.)
* Built‑in donate button (appears after AI response)

## Design Principles

A4 Editor is designed around readability and accessibility.

* Color contrast follows WCAG AAA standards to reduce eye strain
* Text layout uses the golden ratio (1.618) to create balanced margins
* Line spacing is set to 150 percent for improved readability

The goal is to keep the interface invisible and let the text remain the main focus.

## Themes

Available themes:

1. White
2. Light
3. Sepia
4. Dark
5. Black

Each theme includes carefully selected background and text colors, as well as accent colors for selection and interface elements. Dark themes also adjust input fields and modal windows for consistency.

## Fonts

Available font families:

1. IBM Plex Mono
2. IBM Plex Sans
3. IBM Plex Serif
4. Courier Prime
5. Caveat

Font size options:

* Small
* Medium
* Large

Font size and family are saved locally and restored on the next launch.

## Controls and Shortcuts

* Ctrl or Cmd + S: Save text
* Ctrl or Cmd + E: Export text
* Tab: Insert tab character (disabled when any overlay is open)
* Red marker (top‑right dot): Save changes (single click) or open AI window (when no unsaved changes)
* Gray marker: Click to open menu (or double‑click/long‑press on any marker)
* AI window: Enter prompt, press Enter for new line, Ctrl+Enter to send
* Prompt templates: click a chip to apply, long‑press to edit/delete
* Clear button: resets input and result fields in AI window

## AI Integration

A4 Editor includes an optional AI assistant powered by DeepSeek. To enable:

1. Open the main menu (double‑click or long‑press the marker)
2. Select AI Provider → DeepSeek
3. Enter your DeepSeek API key
4. The AI window becomes available (single click on the gray marker when no unsaved changes)

The AI can operate on:
- the entire document, or
- only the selected text.

Pre‑defined prompt templates can be created, edited, and deleted. After an AI response, action buttons (Change, Insert, Copy) allow you to apply the result.

## Analytics & Admin Dashboard

A4 Editor collects anonymous usage statistics to help improve the application. No personal data (IP, email, text content) is transmitted. Each device generates a random identifier stored in localStorage.

The collected data includes:
- App launch events
- AI window openings
- Prompt sends (only the length of the prompt)
- Actions taken on AI results (Change, Insert, Copy)

The admin dashboard (available at `/admin/`) provides aggregated metrics:
- Total events
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Unique devices (all‑time)
- Top versions used
- Distribution of event types

Access is protected by a simple password (default: `a4admin`). The dashboard uses session authentication, CSRF protection, and rate limiting.

## Technology Stack

* HTML5
* CSS3 (with custom properties and responsive design)
* JavaScript (ES Modules)
* Service Workers for offline support
* Web App Manifest for PWA installation
* PHP (backend for AI proxy and analytics storage)
* SQLite (lightweight database for analytics)

All user data (text content, settings, prompts) is stored locally in the browser. No server-side processing is used for the core editor. The PHP backend only handles AI requests and analytics storage.

## Installation

### PWA Installation

1. Open the online version in a supported browser
2. Use the browser’s install option
3. The app will be available as a standalone application

### Local Installation

1. Clone the repository
2. Place the folder in a web server environment (Apache/Nginx with PHP support)
3. Ensure the `proxy/` directory is writable for SQLite database creation
4. Open `index.html` in a browser (or access via the server URL)

The app will work offline after the first load.

### Android

An Android APK file is included in the `android` directory and can be installed directly on compatible devices.

## Project Status

The project is currently in beta stage. Core functionality is complete, and future improvements may include refactoring, additional font options, extended AI providers, and enhanced analytics. The codebase is considered production‑ready for MVP use.

## Author

[Evgenii Bykov](https://github.com/evbkv)

## License

GNU General Public License v3.0

## Screenshot

![Screenshot](screenshot.jpg)