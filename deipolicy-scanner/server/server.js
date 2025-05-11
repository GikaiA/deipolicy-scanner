import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import cors from 'cors';
import dotenv from 'dotenv';
import { Configuration, OpenAIApi } from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Configure OpenAI API
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Helper function to scrape webpage content
async function scrapeWebsite(url) {
  try {
    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Remove script tags, style tags, and other non-content elements
    $('script, style, meta, link, noscript').remove();
    
    // Extract text content from body
    let text = $('body').text();
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Return first 10000 characters to avoid token limits
    return text.substring(0, 10000);
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
}

// Function to extract DEI policy using OpenAI
async function extractDEIPolicy(content, url) {
  try {
    const prompt = `
You are an AI assistant helping to extract Diversity, Equity, and Inclusion (DEI) policies from website content.
Below is text scraped from the website: ${url}

Your task:
1. Identify any DEI-related policies, statements, commitments, or initiatives from the content.
2. Extract relevant paragraphs that discuss diversity, equity, inclusion, belonging, or related topics.
3. Format the extracted policy in a structured way.
4. If no explicit DEI policy is found, note this and extract any related information that might indicate the organization's stance on diversity and inclusion.

Website content:
${content}

Response:`;

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that extracts DEI policies from website content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error extracting DEI policy with OpenAI:', error);
    throw new Error(`Failed to extract DEI policy: ${error.message}`);
  }
}

// Main endpoint to search and extract DEI policies
app.post('/api/search-dei', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    console.log(`Scraping DEI policy from: ${url}`);
    
    // 1. Scrape website content
    const content = await scrapeWebsite(url);
    
    // 2. Extract DEI policy using OpenAI
    const deiPolicy = await extractDEIPolicy(content, url);
    
    // 3. Return the extracted DEI policy
    res.json({ 
      url, 
      deiPolicy 
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, '../dist')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});