// server.js - Backend for DEI policy scraping
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { load } from 'cheerio';
import { Configuration, OpenAIApi } from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Configure OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Scrape website content
async function scrapeWebsite(url) {
  try {
    // Add http protocol if not present
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    const response = await axios.get(url);
    const html = response.data;
    const $ = load(html);
    
    // Extract text content from the page, focusing on paragraphs, headings, and list items
    let textContent = '';
    $('p, h1, h2, h3, h4, h5, h6, li').each((_, element) => {
      textContent += $(element).text() + '\n';
    });
    
    return textContent;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
}

// Find potential DEI policy pages from a domain
async function findDEIPages(domain) {
  try {
    // Add http protocol if not present
    if (!domain.startsWith('http')) {
      domain = 'https://' + domain;
    }

    const response = await axios.get(domain);
    const html = response.data;
    const $ = load(html);
    
    const potentialLinks = [];
    
    // Keywords that might indicate DEI policy pages
    const deiKeywords = ['diversity', 'equity', 'inclusion', 'dei', 'equality', 
                         'belonging', 'responsible', 'responsibility', 'esg', 
                         'social responsibility', 'about us', 'about', 'mission', 'values'];
    
    // Find links that might be DEI-related
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().toLowerCase();
      
      if (href && text) {
        const hasKeyword = deiKeywords.some(keyword => 
          text.includes(keyword)
        );
        
        if (hasKeyword) {
          // Handle relative URLs
          let fullUrl = href;
          if (href.startsWith('/')) {
            fullUrl = new URL(href, domain).toString();
          } else if (!href.startsWith('http')) {
            fullUrl = new URL(href, domain).toString();
          }
          
          // Exclude common non-HTML resources and external domains
          if (!fullUrl.match(/\.(jpg|jpeg|png|gif|css|js)$/i) && 
              (fullUrl.includes(new URL(domain).hostname))) {
            potentialLinks.push(fullUrl);
          }
        }
      }
    });
    
    return [...new Set(potentialLinks)]; // Remove duplicates
  } catch (error) {
    console.error(`Error finding DEI pages for ${domain}:`, error.message);
    throw new Error(`Failed to find DEI pages: ${error.message}`);
  }
}

// Analyze content with ChatGPT to extract DEI policies
async function extractDEIPolicies(content) {
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system", 
          content: "You are an assistant that extracts and summarizes Diversity, Equity, and Inclusion policies from website content. Extract key policies, commitments, initiatives, and goals related to DEI. If no DEI content is found, state that clearly."
        },
        {
          role: "user",
          content: `Extract and summarize the DEI policies from the following website content: ${content.substring(0, 8000)}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });
    
    return completion.data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling OpenAI API:", error.message);
    throw new Error(`Failed to analyze content with OpenAI: ${error.message}`);
  }
}

// Main endpoint to search DEI policies
app.post('/api/search', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Clean the URL (remove http/https if present for consistency)
    const domain = url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    const fullUrl = 'https://' + domain;
    
    // Find potential DEI pages
    const deiPages = await findDEIPages(fullUrl);
    
    // If no DEI pages found, try to analyze the homepage
    if (deiPages.length === 0) {
      const content = await scrapeWebsite(fullUrl);
      const analysis = await extractDEIPolicies(content);
      
      return res.json({
        url: fullUrl,
        deiPolicies: analysis,
        pagesAnalyzed: [fullUrl]
      });
    }
    
    // Otherwise, analyze the potential DEI pages (limit to 3 to avoid excessive processing)
    const pagesToAnalyze = deiPages.slice(0, 3);
    const results = [];
    
    for (const pageUrl of pagesToAnalyze) {
      const content = await scrapeWebsite(pageUrl);
      const analysis = await extractDEIPolicies(content);
      
      results.push({
        url: pageUrl,
        policies: analysis
      });
    }
    
    return res.json({
      url: fullUrl,
      deiPolicies: results,
      pagesAnalyzed: pagesToAnalyze
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: error.message || 'An error occurred while processing your request' });
  }
});

// Development setup with Vite
async function createDevServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  // Fallback for SPA routing
  app.use('*', async (req, res, next) => {
    try {
      const url = req.originalUrl;
      
      // Only serve the frontend for non-API routes
      if (!url.startsWith('/api')) {
        let template = await vite.transformIndexHtml(url, ''); // You might need to read the actual index.html file
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } else {
        next();
      }
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}

// Production setup to serve built assets
function setupProduction() {
  const distPath = join(__dirname, 'dist');
  app.use(express.static(distPath));
  
  // Fallback for SPA routing
  app.get('*', (req, res) => {
    // Only serve the frontend for non-API routes
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(distPath, 'index.html'));
    }
  });
}

// Setup server based on environment
if (process.env.NODE_ENV === 'production') {
  setupProduction();
} else {
  createDevServer().catch(console.error);
}

// Start server
try {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`API endpoint available at http://localhost:${PORT}/api/search`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

export default app;