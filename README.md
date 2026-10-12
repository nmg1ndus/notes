# Vyut Notes

Vyut Notes is a modern, static, single-page application (SPA) designed for reading computer science notes and writing/executing code directly within the browser. It features a completely serverless architecture, utilizing hash-based routing and the GitHub REST API to dynamically fetch and display chapters.

## Features
 
*   **Integrated Playground (IDE):** 
    *   **Local Execution:** Run HTML/CSS/JS and Python (via Skulpt) natively in the browser without any backend API.
    *   **Multi-Language Support:** Execute compiled languages like C, C++, and Java via the Piston API fallback.
    *   **Interactive Prompts:** Custom bottom-sheet UI for Python's `input()` function that blocks browser autofill.
*   **Modern UI/UX:** Clean, card-based interface with automatic system-preference Dark/Light mode and smooth bottom-sheet modals.
*   **Advanced Code Editor:** Includes syntax highlighting, line numbers, tab-spacing support, and Fira Code font ligatures.
*   **Rich Text Formatting:** Custom markdown-like parser supporting **bold**, *italic*, __underline__, `inline code`, and fully structured | tables |.
*   **Bilingual Support:** Easily toggle between English and Hindi notes globally.
*   **Zero Configuration Hosting:** 100% static files. Perfectly optimized for GitHub Pages with no external server routing needed.

## Project Structure

The project dynamically scans folders. Each folder represents a chapter and contains its respective metadata and bilingual note files.

```text
/
├── index.html           # Main entry point
├── style.css            # Stylesheet (UI, Dark Mode, Code Editor)
├── app.js               # Core logic (Routing, Editor, Skulpt Engine)
├── chapters.json        # Fallback list of chapters (if GitHub API limits are reached)
└── folder_name/         # Example Chapter Folder (e.g., /python_basics)
    ├── skill.json       # Metadata (Title, Class, Programming config)
    ├── english.json     # English notes content
    └── hindi.json       # Hindi notes content
```

## How to Add a New Chapter

1. Create a Folder
Create a new folder in the root directory. The folder name will be the URL hash (e.g., creating a folder named `networking` will be accessible at `domain.com/#/networking`).
> ⚠️ Note: Do not use reserved names like `index.html`, `style.css`, `app.js`, or `chapters.json` for folder names.

2. Add `skill.json`
Inside your new folder, create a `skill.json` file for metadata.

```json
{
  "title": {
    "en": "Python Basics",
    "hi": "पायथन बेसिक्स"
  },
  "description": {
    "en": "Learn the basics of Python programming.",
    "hi": "पायथन प्रोग्रामिंग के बेसिक्स सीखें।"
  },
  "class": "8",
  "programming": true,
  "language": "python",
  "execution": "interpreter"
}
```

3. Add Content (`english.json` & `hindi.json`)
Create the content files using this structure:

```json
{
  "summary": "This is a brief summary of the chapter.",
  "sections": [
    {
      "heading": "Introduction",
      "text": "You can use **bold**, *italic*, and __underline__ here.",
      "points": ["Point 1", "Point 2"],
      "tip": "This is an important highlight box."
    }
  ],
  "questions": [
    {
      "q": "Write a program to print Hello World.",
      "answer": "Use the `print()` function.",
      "code": "print('Hello, World!')",
      "algorithm": ["Start", "Print Hello World", "Stop"]
    }
  ]
}
```

## Deployment
* This project is built for GitHub Pages.
* Simply push the code to your GitHub repository and enable GitHub Pages from the repository settings (deploying from the `main` branch or `/root` directory).
* Since routing is handled entirely via JavaScript Hash URLs (`/#/chapter-name`), no backend configuration or URL rewrites are required!
