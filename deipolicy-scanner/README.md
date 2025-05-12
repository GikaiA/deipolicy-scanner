# DEI Policy Scanner

A web application that scans websites for DEI (Diversity, Equity, and Inclusion) policies using OpenAI's GPT-4 API.

## Features

- Scan any website for DEI policies
- AI-powered analysis of website content
- Detailed summary of findings
- Recommendations for improvement
- Clean and modern user interface

## Prerequisites

- Node.js (v14 or higher)
- OpenAI API key

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory with the following content:
   ```
   PORT=5000
   OPENAI_API_KEY=your_openai_api_key_here
   ```
   Replace `your_openai_api_key_here` with your actual OpenAI API key.

## Running the Application

1. Start both frontend and backend servers:
   ```bash
   npm run dev:all
   ```
   This will start:
   - Frontend on http://localhost:3000
   - Backend on http://localhost:5000

2. Open your browser and navigate to http://localhost:3000

## Usage

1. Enter a website URL in the input field
2. Click "Scan Website"
3. Wait for the analysis to complete
4. Review the results, including:
   - Summary of DEI policies
   - Key findings
   - Recommendations (if any)

## Technologies Used

- Frontend:
  - React
  - Vite
  - Plain CSS
- Backend:
  - Node.js
  - Express
  - OpenAI API
  - Cheerio (for web scraping)

## Note

This application uses OpenAI's GPT-4 API to analyze website content. Make sure you have a valid API key and sufficient credits in your OpenAI account.
