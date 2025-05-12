import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import axios from 'axios'
import * as cheerio from 'cheerio'
import path from 'path'
import { fileURLToPath } from 'url'

// Get the directory name
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '.env') })

// Debug: Log environment variables (excluding the actual API key for security)
console.log('Environment loaded:', {
  PORT: process.env.PORT,
  hasOpenAIKey: !!process.env.OPENAI_API_KEY
})

const app = express()
const port = process.env.PORT || 5000

// Check for OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables')
  process.exit(1)
}

// Middleware
app.use(cors())
app.use(express.json())

// Initialize OpenAI with explicit API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Function to scrape website content
async function scrapeWebsite(url) {
  try {
    const response = await axios.get(url)
    const $ = cheerio.load(response.data)
    
    // Remove script and style elements
    $('script').remove()
    $('style').remove()
    
    // Get text content from body
    const text = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
    
    return text
  } catch (error) {
    throw new Error('Failed to scrape website content')
  }
}

// Function to analyze content with OpenAI
async function analyzeContent(content) {
  try {
    console.log('Starting content analysis...')
    
    if (!content || content.trim().length === 0) {
      throw new Error('No content to analyze')
    }

    const prompt = `Analyze the following website content for DEI (Diversity, Equity, and Inclusion) policies and practices. 
    Provide a summary, key findings, and recommendations if applicable. Format the response as JSON with the following structure:
    {
      "summary": "Brief summary of DEI policies found",
      "findings": ["List of key findings"],
      "recommendations": ["List of recommendations if any gaps are found"]
    }
    
    Content to analyze:
    ${content.substring(0, 4000)}` // Limit content to avoid token limits

    console.log('Sending request to OpenAI...')
    
    try {
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a DEI policy analyst. Analyze the content and provide structured feedback about DEI policies and practices."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "gpt-3.5-turbo", // Changed to a more commonly available model
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1000
      })

      console.log('Received response from OpenAI')
      
      if (!completion.choices || !completion.choices[0] || !completion.choices[0].message) {
        throw new Error('Invalid response format from OpenAI')
      }

      const responseContent = completion.choices[0].message.content
      console.log('Parsing OpenAI response...')
      
      try {
        const parsedResponse = JSON.parse(responseContent)
        return parsedResponse
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError)
        throw new Error('Invalid JSON response from OpenAI')
      }
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError.message)
      if (openaiError.response) {
        console.error('OpenAI API response:', openaiError.response.data)
      }
      throw new Error(`OpenAI API error: ${openaiError.message}`)
    }
  } catch (error) {
    console.error('Analysis error:', error)
    throw new Error(`Failed to analyze content: ${error.message}`)
  }
}

// API endpoint
app.post('/api/scan', async (req, res) => {
  const { url } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  try {
    console.log('Starting website scan for:', url)
    const content = await scrapeWebsite(url)
    console.log('Website content scraped successfully')
    
    if (!content || content.trim().length === 0) {
      throw new Error('No content could be extracted from the website')
    }
    
    const analysis = await analyzeContent(content)
    console.log('Analysis completed successfully')
    res.json(analysis)
  } catch (error) {
    console.error('Scan error:', error)
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || 'No additional details available'
    })
  }
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
}) 