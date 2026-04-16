# Roomify

Transform floor plan photos into beautiful AI-rendered visualizations instantly.



https://github.com/user-attachments/assets/4ab9d9db-f995-4752-ac04-46dd601bfb2d



## What is Roomify?

Roomify is an AI-powered interior design tool that transforms your floor plan photos into stunning 3D visualizations. Simply upload a photo of a floor plan, and Roomify uses AI to generate beautiful renderings that help you visualize the space.

## Features

- 📸 **Photo to Render** - Upload any floor plan photo and get an instant AI rendering
- 🎨 **AI-Powered** - Powered by advanced AI image generation
- 💾 **Save & Share** - Save your projects privately or share with the community
- 📱 **Simple Workflow** - Upload → Generate → Compare → Export

## Getting Started

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## How It Works

1. **Upload** - Drop your floor plan image (JPG, PNG)
2. **AI Processing** - The AI analyzes your floor plan and generates a render
3. **Compare** - Use the before/after slider to compare floor plan vs render
4. **Export** - Download your visualization

## Tech Stack

- **Frontend**: React Router v7, React 19, Tailwind CSS v4
- **Backend**: Puter.js (browser-based cloud)
- **AI**: Gemini AI for image generation

## Deployment

### Docker

```bash
docker build -t roomify .

# Run the container
docker run -p 3000:3000 roomify
```

### Puter Deployment

Roomify runs entirely in the browser using Puter.js - no traditional backend required!

---

Built with ❤️ using React Router and Puter.js
