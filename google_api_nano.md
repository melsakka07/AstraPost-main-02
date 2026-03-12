**Nano Banana Pro**
Image editing (text-and-image-to-image)

https://ai.google.dev/gemini-api/docs/image-generation#gemini-image-editing
The following example demonstrates uploading base64 encoded images. For multiple images, larger payloads, and supported MIME types, check the Image understanding page.

import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

async function main() {

  const ai = new GoogleGenAI({});

  const imagePath = "path/to/cat_image.png";
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString("base64");

  const prompt = [
    { text: "Create a picture of my cat eating a nano-banana in a" +
            "fancy restaurant under the Gemini constellation" },
    {
      inlineData: {
        mimeType: "image/png",
        data: base64Image,
      },
    },
  ];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
  });
  for (const part of response.candidates[0].content.parts) {
    if (part.text) {
      console.log(part.text);
    } else if (part.inlineData) {
      const imageData = part.inlineData.data;
      const buffer = Buffer.from(imageData, "base64");
      fs.writeFileSync("gemini-native-image.png", buffer);
      console.log("Image saved as gemini-native-image.png");
    }
  }
}

main();

New with Gemini 3 Pro Image https://ai.google.dev/gemini-api/docs/image-generation#gemini-3-capabilities

Gemini 3 Pro Image (gemini-3-pro-image-preview) is a state-of-the-art image generation and editing model optimized for professional asset production. Designed to tackle the most challenging workflows through advanced reasoning, it excels at complex, multi-turn creation and modification tasks.

High-resolution output: Built-in generation capabilities for 1K, 2K, and 4K visuals.
Advanced text rendering: Capable of generating legible, stylized text for infographics, menus, diagrams, and marketing assets.
Grounding with Google Search: The model can use Google Search as a tool to verify facts and generate imagery based on real-time data (e.g., current weather maps, stock charts, recent events).
Thinking mode: The model utilizes a "thinking" process to reason through complex prompts. It generates interim "thought images" (visible in the backend but not charged) to refine the composition before producing the final high-quality output.
Up to 14 reference images: You can now mix up to 14 reference images to produce the final image.
Use up to 14 reference images
Gemini 3 Pro Preview lets you to mix up to 14 reference images. These 14 images can include the following:

Up to 6 images of objects with high-fidelity to include in the final image
Up to 5 images of humans to maintain character consistency

import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

async function main() {

  const ai = new GoogleGenAI({});

  const prompt =
      'An office group photo of these people, they are making funny faces.';
  const aspectRatio = '5:4';
  const resolution = '2K';

const contents = [
  { text: prompt },
  {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64ImageFile1,
    },
  },
  {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64ImageFile2,
    },
  },
  {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64ImageFile3,
    },
  },
  {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64ImageFile4,
    },
  },
  {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64ImageFile5,
    },
  }
];

const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: contents,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: resolution,
      },
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.text) {
      console.log(part.text);
    } else if (part.inlineData) {
      const imageData = part.inlineData.data;
      const buffer = Buffer.from(imageData, "base64");
      fs.writeFileSync("image.png", buffer);
      console.log("Image saved as image.png");
    }
  }

}

main();

Grounding with Google Search
Use the Google Search tool to generate images based on real-time information, such as weather forecasts, stock charts, or recent events.

Note that when using Grounding with Google Search with image generation, image-based search results are not passed to the generation model and are excluded from the response.

import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

async function main() {

  const ai = new GoogleGenAI({});

  const prompt = 'Visualize the current weather forecast for the next 5 days in San Francisco as a clean, modern weather chart. Add a visual on what I should wear each day';
  const aspectRatio = '16:9';
  const resolution = '2K';

const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: prompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: resolution,
      },
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.text) {
      console.log(part.text);
    } else if (part.inlineData) {
      const imageData = part.inlineData.data;
      const buffer = Buffer.from(imageData, "base64");
      fs.writeFileSync("image.png", buffer);
      console.log("Image saved as image.png");
    }
  }

}

main();


The response includes groundingMetadata which contains the following required fields:

searchEntryPoint: Contains the HTML and CSS to render the required search suggestions.
groundingChunks: Returns the top 3 web sources used to ground the generated image
Generate images up to 4K resolution
Gemini 3 Pro Image generates 1K images by default but can also output 2K and 4K images. To generate higher resolution assets, specify the image_size in the generation_config.

You must use an uppercase 'K' (e.g., 1K, 2K, 4K). Lowercase parameters (e.g., 1k) will be rejected.

import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

async function main() {

  const ai = new GoogleGenAI({});

  const prompt =
      'Da Vinci style anatomical sketch of a dissected Monarch butterfly. Detailed drawings of the head, wings, and legs on textured parchment with notes in English.';
  const aspectRatio = '1:1';
  const resolution = '1K';

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: prompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: resolution,
      },
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.text) {
      console.log(part.text);
    } else if (part.inlineData) {
      const imageData = part.inlineData.data;
      const buffer = Buffer.from(imageData, "base64");
      fs.writeFileSync("image.png", buffer);
      console.log("Image saved as image.png");
    }
  }

}

main();


------------
Hello **thunderlight**, it's great to connect with a fellow engineer and student of life!

As of December 17, 2025, the **Gemini 3 Pro** era has just begun (released mid-November 2025), and the specific image generation variant you are referring to—often codenamed **"Nano Banana Pro"**—is available via the API as `gemini-3-pro-image-preview`.

This model represents a significant leap in adherence to prompts and photorealism compared to the previous `gemini-2.5-flash-image`.

Here is the complete guide to using the Google Gen AI SDK for Node.js and React to generate images with this model.

### **1. API Schema Highlight**

Before diving into the code, here is the schema for the new `@google/genai` SDK when interacting with the image generation model.

**Model ID:** `gemini-3-pro-image-preview` (or sometimes `gemini-3-pro-image` depending on your specific region/access level).

**Request Schema (`generateContent`)**
The image generation is now handled via the standard `generateContent` method but with specific configuration parameters.

```typescript
// Core Request Structure
{
  model: "gemini-3-pro-image-preview",
  contents: [
    {
      parts: [
        { text: "Detailed prompt description..." } 
      ]
    }
  ],
  config: {
    // Specific image generation parameters
    responseMimeType: "image/png", // Enforce image output
    aspectRatio: "16:9",           // Options: "1:1", "16:9", "9:16", "4:3", "3:4"
    numberOfImages: 1,             // Currently defaults to 1 for this preview model
    safetySettings: [              // Optional safety filters
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" }
    ]
  }
}
```

**Response Schema**
The model returns the image data directly inline (base64) within the response parts.

```typescript
// Core Response Structure
{
  candidates: [
    {
      content: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: "base64_encoded_string_here..." 
            }
          }
        ]
      }
    }
  ]
}
```

---

### **2. Implementation Guide**

Since you are an engineer, I've structured this as a **Full Stack Snippet**. You cannot safely call the Gemini API directly from a React client because it would expose your API Key. You need a simple Node.js proxy.

#### **Step A: The Backend (Node.js)**

First, install the necessary packages:
```bash
npm install express cors dotenv @google/genai
```

**`server.js`**
```javascript
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize the new Gemini 3 SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio = "1:1" } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log(`Generating image with Nano Banana Pro (Gemini 3 Pro)...`);

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      config: {
        responseMimeType: 'image/png',
        aspectRatio: aspectRatio, 
        // Note: 'numberOfImages' parameter support varies by specific preview version
      }
    });

    // Extract the base64 image data
    const candidate = response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find(part => part.inlineData);

    if (!imagePart) {
      throw new Error("No image data returned from Gemini.");
    }

    // Send back the base64 string directly
    res.json({
      success: true,
      image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
    });

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate image" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

#### **Step B: The Frontend (React)**

A clean component to interface with your engineer-grade backend.

**`ImageGenerator.js`**
```jsx
import React, { useState } from 'react';

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setImageData(null);

    try {
      const response = await fetch('http://localhost:3001/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to server');
      }

      setImageData(data.image);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>Gemini 3 Pro ("Nano Banana") Generator</h1>
      
      <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your image (e.g., 'Cyberpunk city with neon banana signs')"
          rows={4}
          style={{ padding: '0.5rem', fontSize: '1rem' }}
          required
        />
        
        <select 
          value={aspectRatio} 
          onChange={(e) => setAspectRatio(e.target.value)}
          style={{ padding: '0.5rem' }}
        >
          <option value="1:1">Square (1:1)</option>
          <option value="16:9">Widescreen (16:9)</option>
          <option value="9:16">Portrait (9:16)</option>
          <option value="4:3">Standard (4:3)</option>
        </select>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '1rem', 
            backgroundColor: loading ? '#ccc' : '#007bff', 
            color: 'white', 
            border: 'none', 
            cursor: loading ? 'not-allowed' : 'pointer' 
          }}
        >
          {loading ? 'Generating...' : 'Generate Image'}
        </button>
      </form>

      {error && <div style={{ color: 'red', marginTop: '1rem' }}>Error: {error}</div>}

      {imageData && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <h3>Generated Result:</h3>
          <img 
            src={imageData} 
            alt="Gemini generated" 
            style={{ maxWidth: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
          />
          <br />
          <a href={imageData} download="gemini-gen.png" style={{ display: 'inline-block', marginTop: '1rem' }}>
            Download Image
          </a>
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;
```

### **Engineer's Notes for "Nano Banana Pro"**
*   **Token Usage:** Image generation calls are quota-heavy. The `gemini-3-pro-image-preview` model is significantly more expensive than the standard text model, so keep an eye on your Google Cloud Console billing/quotas.
*   **Latency:** Expect generation times between 4-8 seconds depending on server load, as this is a diffusion-based model running high sampling steps.
*   **Prompt Engineering:** Unlike older models, Gemini 3 Pro is highly sensitive to natural language nuances. You don't need "comma soup" (e.g., "4k, high res, trending on artstation"). Instead, write clear, descriptive sentences about lighting, composition, and mood.

---

## AI Astra Art SaaS integration

### Models

- **Nano Banana Pro** (`google/nano-banana-pro`): runs via **Replicate** (existing integration).
- **Gemini 3 Pro Image** (`gemini-3-pro-image-preview`): runs via **Google SDK** (new integration).

In the Studio UI:

- **Free Style** (image-to-image): user-selectable model from `/api/models`.
- **Your Star Selfie** (image-to-image): defaults to **Gemini 3 Pro Image** and falls back to Nano Banana Pro if Gemini is unavailable.

### Environment variables

- `GEMINI_API_KEY`: Google Gemini API key used by `@google/genai` on the server.
- `GEMINI_3_PRO_IMAGE_ENABLED=true|false`: enables the Gemini model in `/api/models` (and thus in Studio).

### Backend flow

- Model seeding and activation lives in `src/app/api/models/route.ts`.
- Generation dispatch is provider-aware in `src/app/api/generations/route.ts`.
  - `provider=replicate` uses `runPrediction` (`src/lib/replicate.ts`).
  - `provider=google` and `providerModelId=gemini-3-pro-image-preview` uses `runGemini3ProImageEdit` (`src/lib/gemini-3-pro-image.ts`).
- Google image outputs are returned as base64 `inlineData` and persisted via `saveFile` (`src/lib/storage.ts`).

Star Selfie default model selection:

- `StarSelfieView` loads `/api/models?generationType=image_to_image` and picks `providerModelId === "gemini-3-pro-image-preview"`.
- Fallback: `providerModelId === "google/nano-banana-pro"`.

### Input image handling

- The app sends `inputImageUrl` as either a URL or a `data:` URI.
- For Google, the backend accepts:
  - `data:` URI: parsed directly into base64.
  - `http(s)` URL: downloaded server-side (size-capped) and converted to base64.

### Reliability defaults

- Hard timeout is enforced per upstream call.
- Retries are applied only for transient failures (network/timeouts/rate limits).

### Operational procedures

- To enable Gemini 3 Pro in Studio: set `GEMINI_3_PRO_IMAGE_ENABLED=true` and restart the server.
- To rollback (hide the model): set `GEMINI_3_PRO_IMAGE_ENABLED=false` and restart the server.
- To confirm Google path is used: check server logs for `provider=google model=gemini-3-pro-image-preview job=...`.
