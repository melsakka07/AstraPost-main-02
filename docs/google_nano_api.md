google/nano-banana
google/nano-banana-pro
google/nano-banana-2
   
///
## Basic model info

Model name: google/nano-banana
Model description: Google's latest image editing model in Gemini 2.5


## Model inputs

- prompt (required): A text description of the image you want to generate (string)
- image_input (optional): Input images to transform or use as reference (supports multiple images) (array)
- aspect_ratio (optional): Aspect ratio of the generated image (string)
- output_format (optional): Format of the output image (string)


## Model output schema

{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/1bwy6kt8r9rm80crx16t6161tm)

#### Input

```json
{
  "prompt": "Make the sheets in the style of the logo. Make the scene natural. ",
  "image_input": [
    "https://replicate.delivery/pbxt/NbYIclp4A5HWLsJ8lF5KgiYSNaLBBT1jUcYcHYQmN1uy5OnN/tmpcqc07f_q.png",
    "https://replicate.delivery/pbxt/NbYId45yH8s04sptdtPcGqFIhV7zS5GTcdS3TtNliyTAoYPO/Screenshot%202025-08-26%20at%205.30.12%E2%80%AFPM.png"
  ],
  "output_format": "jpg"
}
```

#### Output

```json
"https://replicate.delivery/xezq/eQ2MQYrD6XzheEgCe7OcHlUJAXYc8HaMJmGPmbTOCClZS7dqA/tmp4vqrduzh.jpg"
```


### Example (https://replicate.com/p/zbw2b1aw05rma0cs29aa12r310)

#### Input

```json
{
  "prompt": "have the people smile and take a selfie from a phone",
  "image_input": [
    "https://replicate.delivery/pbxt/NeRx7gSc6ORMdhCjOzV0Of9VAEDNjQ56RJWVXFTjT53AK5L1/billie.jpeg",
    "https://replicate.delivery/pbxt/NeRx7dSeZKRgWr0V6ilLhZsk8HSZgV3Z9VsauD7FSYrrvuXD/michael.jpeg"
  ],
  "output_format": "jpg"
}
```

#### Output

```json
"https://replicate.delivery/xezq/mbE0pfJqUtTfu0vp7gjG93nkNYNsy78a1onho9oos56fkTjqA/tmpgxxuv701.jpg"
```


### Example (https://replicate.com/p/2xnpn32ppsrmr0cweze861y654)

#### Input

```json
{
  "prompt": "A vintage travel poster for Tokyo, Japan in the style of 1960s airline advertisements, with Mount Fuji in the background and cherry blossoms framing the scene",
  "aspect_ratio": "9:16"
}
```

#### Output

```json
"https://replicate.delivery/xezq/8SFezUxl8nx2HqSyhznw2tdgJ7J9EU39Z6uSxJvZzZf0YTJWA/tmpmru_1vc9.jpeg"
```


### Example (https://replicate.com/p/4g6mwsatp1rmy0cwezeb2gbwn4)

#### Input

```json
{
  "prompt": "A photorealistic macro shot of dewdrops on a spider web at sunrise, with rainbow light refracting through each droplet",
  "aspect_ratio": "1:1"
}
```

#### Output

```json
"https://replicate.delivery/xezq/1i1kL3iCGgpEGlUdXTCScBfQfHfZ5aZe556DtugeAQxqGbKxC/tmpkqbpjy7j.jpeg"
```


### Example (https://replicate.com/p/5jfzc6v4gsrmw0cwezebz4p83w)

#### Input

```json
{
  "prompt": "A dramatic oil painting of a lighthouse in a storm at night, with massive waves crashing against the rocks and lightning illuminating the sky",
  "aspect_ratio": "3:4"
}
```

#### Output

```json
"https://replicate.delivery/xezq/yt1WVoKMpP6wEJNKePooBav9qopaGnzBLWldprAQpxVcspELA/tmp99gg61j_.jpeg"
```


### Example (https://replicate.com/p/59xt8sdrr9rmw0cwezeanrx6dc)

#### Input

```json
{
  "prompt": "A watercolor illustration of a fox reading a book under a mushroom in an enchanted forest",
  "aspect_ratio": "4:3"
}
```

#### Output

```json
"https://replicate.delivery/xezq/iDRe5MMZ5VR3V6LZXUq8fkVdSqR4hx0lotJ1vMhtHEIQZTJWA/tmpiuf9l64b.jpeg"
```


### Example (https://replicate.com/p/56nwqvxwpnrmy0cwezeac4q7a8)

#### Input

```json
{
  "prompt": "Professional headshot photograph of a golden retriever wearing a business suit and tie, sitting at a mahogany desk with a nameplate that says 'CEO'",
  "aspect_ratio": "1:1"
}
```

#### Output

```json
"https://replicate.delivery/xezq/FoUV6WyL15LMD53ma5He2Oi4kguWL1gyqBlfRJlozkyUZTJWA/tmpqkyugdkx.jpeg"
```


### Example (https://replicate.com/p/dgcsxxy0jsrmr0cweze9tavwkc)

#### Input

```json
{
  "prompt": "An underwater scene of a coral reef teeming with tropical fish, sea turtles, and rays of sunlight filtering through the crystal clear water",
  "aspect_ratio": "16:9"
}
```

#### Output

```json
"https://replicate.delivery/xezq/dkVeoT5cA9yRH6lRVaFIYsY2JTxxtyIkHjSKfFEqGLhTZTJWA/tmpk8lejwfh.jpeg"
```


### Example (https://replicate.com/p/8xp2y96tm5rmy0cweze8hj6af0)

#### Input

```json
{
  "prompt": "A minimalist flat-lay photograph of artisan bread, olive oil, fresh herbs, and aged cheese on a rustic wooden cutting board",
  "aspect_ratio": "1:1"
}
```

#### Output

```json
"https://replicate.delivery/xezq/7dM46yJjjr4MA5gyOojw8jZMnFQS5AJHumbf7HEyOHKsspELA/tmptfkuj84z.jpeg"
```


### Example (https://replicate.com/p/gmrwha6ze1rmr0cweze8a16t2r)

#### Input

```json
{
  "prompt": "An aerial photograph of terraced rice paddies in Bali at golden hour, with mist rising from the valleys between lush green hills",
  "aspect_ratio": "16:9"
}
```

#### Output

```json
"https://replicate.delivery/xezq/eLbWKXSNjvT4ZKjqf2wql2cFGtgzpAYeiFxHvkF6QtIxymSsA/tmpyqqoz5y4.jpeg"
```


### Example (https://replicate.com/p/xxrm52shhxrmt0cwezets9y5hc)

#### Input

```json
{
  "prompt": "Transform this image into a Studio Ghibli anime style illustration",
  "image_input": [
    "https://replicate.delivery/xezq/LOB8lf7PV81RfUcAqkPBeuZ9J4DE20XyH1Z6Mk7nRTZtxmSsA/tmpwa9w0ve8.jpeg"
  ]
}
```

#### Output

```json
"https://replicate.delivery/xezq/oEUPbaOFKWJ9DVhyJfAeCeh2wI4HlfrVm2pbjEToefzJd2UiF/tmp3ivggo5f.jpeg"
```


### Example (https://replicate.com/p/q3mtzkhr0srmw0cwezevwym8wm)

#### Input

```json
{
  "prompt": "Make this scene look like it's set during a snowy winter night with warm light glowing from the windows",
  "image_input": [
    "https://replicate.delivery/xezq/LOB8lf7PV81RfUcAqkPBeuZ9J4DE20XyH1Z6Mk7nRTZtxmSsA/tmpwa9w0ve8.jpeg"
  ]
}
```

#### Output

```json
"https://replicate.delivery/xezq/mmTkfkhHECSBRaTdlWofxYUZlPznQrSuqrHNBesISbouzmSsA/tmpfd_3x95t.jpeg"
```


### Example (https://replicate.com/p/dmnsbfnzf1rmy0cwezgahz7npg)

#### Input

```json
{
  "prompt": "A surreal double exposure photograph combining a wolf's face with a misty pine forest at twilight",
  "aspect_ratio": "1:1"
}
```

#### Output

```json
"https://replicate.delivery/xezq/CR44Keou4Q39Ia12LxPNkCCBbCs0n3QxMDMXZUQgTYtrupELA/tmp8dkww3vx.jpeg"
```


### Example (https://replicate.com/p/40c9sw665xrmr0cwezg9hgg7vw)

#### Input

```json
{
  "prompt": "A cute chibi-style sticker sheet with 9 different poses of a red panda: sleeping, eating ramen, playing guitar, reading, skateboarding, meditating, cooking, painting, and stargazing",
  "aspect_ratio": "1:1"
}
```

#### Output

```json
"https://replicate.delivery/xezq/jbVDulkHQa4WABBgqpgDcgx7pvUkeRPcD3xec2vjF2cXdTJWA/tmp8l33u_h_.jpeg"
```


### Example (https://replicate.com/p/sbx3f0ra45rmt0cwezjaexj0b0)

#### Input

```json
{
  "prompt": "A photorealistic close-up portrait of an elderly Japanese woman with kind eyes and deep smile lines, wearing a traditional indigo kimono, natural lighting",
  "aspect_ratio": "3:4"
}
```

#### Output

```json
"https://replicate.delivery/xezq/Gk6UnsgBurI9LRS6yipHc4JEjwfPPWbbcZKn97TgsTqWwpELA/tmpz8aqeu1e.jpeg"
```


### Example (https://replicate.com/p/jf04r7hg7nrmr0cwezjvqrnrg4)

#### Input

```json
{
  "prompt": "A street art mural on a brick wall depicting a giant octopus wrapping its tentacles around a city skyline, in vibrant spray paint colors",
  "aspect_ratio": "16:9"
}
```

#### Output

```json
"https://replicate.delivery/xezq/ooZgQDXCzRKWCtUeE8EkKUswUzFPm2YsDjYHpN8GEXK9wpELA/tmpv8_mqi51.jpeg"
```


## Model readme

> # Nano Banana
> 
> Google's state-of-the-art image generation and editing model designed for fast, conversational, and multi-turn creative workflows.
> 
> ## Overview
> 
> Gemini 2.5 Flash Image (internally codenamed "nano-banana") is a multimodal model that natively understands and generates images. This model combines high-quality image generation with powerful editing capabilities, all controlled through natural language prompts. It's designed for creators who need precise control over their visual content while maintaining efficiency and ease of use.
> 
> ## Key Features
> 
> ### Character and Style Consistency
> Maintain the same character, object, or style across multiple prompts and images. Place a character in different environments, showcase products from multiple angles, or generate consistent brand assets without time-consuming fine-tuning.
> 
> ### Multi-Image Fusion
> Seamlessly blend multiple input images into a single, cohesive visual. Integrate products into new scenes, restyle environments by combining different elements, or merge reference images to create unified compositions.
> 
> ### Conversational Editing
> Make precise, targeted edits using natural language descriptions. Blur backgrounds, remove objects, alter poses, add color to black-and-white photos, or make any other transformation by simply describing what you want.
> 
> ### Visual Reasoning
> Leverage Gemini's deep world knowledge for complex tasks that require genuine understanding. The model can interpret hand-drawn diagrams, follow multi-step instructions, and generate images that adhere to real-world logic and context.
> 
> ### Native Image Understanding
> The model natively understands and generates images as part of its core architecture, enabling seamless workflows for both creation and editing without switching between different tools or models.
> 
> ## What Makes It Special
> 
> Gemini 2.5 Flash Image stands out for its ability to understand context and maintain visual coherence across edits. Unlike traditional image generation models that excel only at aesthetics, this model benefits from Gemini's extensive world knowledge, allowing it to handle tasks like reading hand-drawn diagrams, understanding spatial relationships, and following complex creative directions.
> 
> The model is particularly effective at preserving subject identity across generations. Whether you're creating a series of marketing images featuring the same product or developing character-consistent artwork for storytelling, the model maintains recognizable features without requiring additional training or fine-tuning.
> 
> ## Intended Use
> 
> This model is designed for:
> 
> - **Creative professionals** who need consistent visual assets across campaigns
> - **Product designers** visualizing items in different contexts and angles
> - **Marketers** creating cohesive brand materials with consistent styling
> - **Content creators** generating character-consistent imagery for storytelling
> - **Developers** building applications that require conversational image editing
> - **Educators** creating visual materials that require semantic understanding
> 
> ## Limitations
> 
> While Gemini 2.5 Flash Image is highly capable, there are some areas where it may not always deliver perfect results:
> 
> - Small faces and fine facial details may occasionally lack precision
> - Complex text rendering within images may sometimes have spelling inconsistencies  
> - Character consistency, while strong, may not be 100% reliable in all scenarios
> - Very intricate fine details may require multiple refinement iterations
> 
> The model is actively being improved to address these limitations.
> 
> ## How It Works
> 
> The model processes both text and image inputs through its multimodal architecture. When generating or editing images, it uses its understanding of the Gemini model family's world knowledge to interpret requests contextually. For editing tasks, it can analyze existing images and apply transformations based on natural language descriptions. For generation tasks, it can reference multiple input images to maintain consistency or blend elements together.
> 
> All images created or edited with this model include SynthID watermarking technology, which embeds an invisible digital watermark to help identify AI-generated or AI-edited content.
> 
> ## Performance
> 
> Gemini 2.5 Flash Image demonstrates state-of-the-art performance in image editing tasks, as validated by LMArena benchmarks where it tested under the codename "nano-banana." The model generates images 2-3 times faster than comparable models while maintaining high quality, making it particularly well-suited for applications requiring quick iteration and real-time creative workflows.
> 
> ## Ethical Considerations
> 
> Google applies extensive filtering and data labeling to minimize harmful content in training datasets and reduce the likelihood of harmful outputs. The model undergoes red teaming and safety evaluations including content safety, child safety, and representation assessments.
> 
> The built-in SynthID watermarking ensures transparency by allowing AI-generated and AI-edited images to be identified, promoting responsible use of AI-generated visual content.
> 
> ## Tips for Best Results
> 
> - **Be specific with descriptions**: Detailed prompts yield more accurate results
> - **Use natural language**: Describe edits conversationally as you would to a human designer
> - **Iterate progressively**: Make changes step-by-step rather than requesting complex multi-part edits at once
> - **Reference visual templates**: When maintaining consistency, use the same reference images across generations
> - **Leverage multi-image fusion**: Combine up to three images to achieve complex compositions
> - **Experiment with aspect ratios**: The model supports multiple aspect ratios for different use cases
> 
> ## Additional Resources
> 
> For detailed API documentation and implementation guides, visit the [Gemini API documentation](https://ai.google.dev/gemini-api/docs).
> 
> ---
> 
> **Try the model yourself on the [Replicate Playground](https://replicate.com/google/nano-banana)** to explore its capabilities and see how it can enhance your creative workflow.

Input schema
Table
JSON
{
  "type": "object",
  "title": "Input",
  "required": [
    "prompt"
  ],
  "properties": {
    "prompt": {
      "type": "string",
      "title": "Prompt",
      "x-order": 0,
      "description": "A text description of the image you want to generate"
    },
    "image_input": {
      "type": "array",
      "items": {
        "type": "string",
        "format": "uri"
      },
      "title": "Image Input",
      "default": [],
      "x-order": 1,
      "description": "Input images to transform or use as reference (supports multiple images)"
    },
    "aspect_ratio": {
      "enum": [
        "match_input_image",
        "1:1",
        "2:3",
        "3:2",
        "3:4",
        "4:3",
        "4:5",
        "5:4",
        "9:16",
        "16:9",
        "21:9"
      ],
      "type": "string",
      "title": "aspect_ratio",
      "description": "Aspect ratio of the generated image",
      "default": "match_input_image",
      "x-order": 2
    },
    "output_format": {
      "enum": [
        "jpg",
        "png"
      ],
      "type": "string",
      "title": "output_format",
      "description": "Format of the output image",
      "default": "jpg",
      "x-order": 3
    }
  }
}

Copy
Output schema
Table
JSON
{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

///

///
## Basic model info

Model name: google/nano-banana-pro
Model description: Google's state of the art image generation and editing model 🍌🍌


## Model inputs

- prompt (required): A text description of the image you want to generate (string)
- image_input (optional): Input images to transform or use as reference (supports up to 14 images) (array)
- aspect_ratio (optional): Aspect ratio of the generated image (string)
- resolution (optional): Resolution of the generated image (string)
- output_format (optional): Format of the output image (string)
- safety_filter_level (optional): block_low_and_above is strictest, block_medium_and_above blocks some prompts, block_only_high is most permissive but some prompts will still be blocked (string)
- allow_fallback_model (optional): Fallback to another model (currently bytedance/seedream-5) if Nano Banana Pro is at capacity. (boolean)


## Model output schema

{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/67tcx1ssmnrm80ctm71963g6f4)

#### Input

```json
{
  "prompt": "35.6586\u00b0 N, 139.7454\u00b0 E at 19:00",
  "resolution": "2K",
  "image_input": [],
  "aspect_ratio": "4:3",
  "output_format": "png",
  "safety_filter_level": "block_only_high"
}
```

#### Output

```json
"https://replicate.delivery/xezq/r9jDvpiCpZ4UPpepWZTfVwd8klFwgAiWRHfUfJZf9JLT2uZtC/tmpexa0dvov.png"
```


### Example (https://replicate.com/p/cx23k6jpgnrmc0ctm7cvzk0s3m)

#### Input

```json
{
  "prompt": "How engineers see the San Francisco Bridge",
  "resolution": "2K",
  "image_input": [],
  "aspect_ratio": "4:3",
  "output_format": "png",
  "safety_filter_level": "block_only_high"
}
```

#### Output

```json
"https://replicate.delivery/xezq/Z0tgPisAiYZZL9F59w7kIGdRY7w0YPS7fJ9VyWga2jZ3Hn1KA/tmp66pw609z.png"
```


### Example (https://replicate.com/p/q8m1sh0drxrme0ctm7gtt26sjw)

#### Input

```json
{
  "prompt": "Show happens to the egg if you add a lot of salt in the water",
  "resolution": "2K",
  "image_input": [
    "https://replicate.delivery/pbxt/O5zNuRklFLRFRVukiwCrJxTBxJppT8DxtawxYQaVsCSEzruK/egg.jpg"
  ],
  "aspect_ratio": "4:3",
  "output_format": "png",
  "safety_filter_level": "block_only_high"
}
```

#### Output

```json
"https://replicate.delivery/xezq/AhXs2axNZ7JXJRvDottEOV6tKIJfazVqLHLfTSJcEZ1UWOrVA/tmpxve4_v3x.png"
```


### Example (https://replicate.com/p/4paeeta6rnrme0ctm87r73pgsw)

#### Input

```json
{
  "prompt": "pull real time weather to build a pop art infographic for Washington D.C",
  "resolution": "2K",
  "image_input": [],
  "aspect_ratio": "4:3",
  "output_format": "png",
  "safety_filter_level": "block_only_high"
}
```

#### Output

```json
"https://replicate.delivery/xezq/ucsY1Zru026yAVdrPvNhOinr2MGQpoyW78tfCeh1ysd1FPrVA/tmpk4e1qvro.png"
```


### Example (https://replicate.com/p/er2a0csngdrma0ctm8baptpgsm)

#### Input

```json
{
  "prompt": "rare.jpg",
  "resolution": "1K",
  "image_input": [],
  "aspect_ratio": "4:3",
  "output_format": "jpg",
  "safety_filter_level": "block_only_high"
}
```

#### Output

```json
"https://replicate.delivery/xezq/piAS0s9DshbqMFXJvIfw9feWaEaNsejlRifhVgMSflvZJzzaF/tmp3u2ym4f_.jpeg"
```


### Example (https://replicate.com/p/1rd9xb7m25rmc0ctm9e969j7gw)

#### Input

```json
{
  "prompt": "an office team photo, everyone making a silly face",
  "resolution": "2K",
  "image_input": [
    "https://replicate.delivery/pbxt/O61OKYNMCfhPTvuTf6SdRVwNlIpoKMeQPQw5WygFtvDwhWgh/guy.webp",
    "https://replicate.delivery/pbxt/O61OK9ETMHHJO5m0qlCkGLhr5lcmbZ08U42C8PWLd4uszDQr/bob-ross.png",
    "https://replicate.delivery/pbxt/O61OKPSxpwgO83SLFGenwEcGNdEAirtw26cIfvuIxz8FeTvf/jennai.jpg",
    "https://replicate.delivery/pbxt/O61OKGAI2lrcNy9I4tpUB4RPbsBUjcaxAjYjVlxRBHc2aIgK/01.webp",
    "https://replicate.delivery/pbxt/O61OKEMaqM46GAnoSwzDpZJRmo922lNZELRUZo3lr4MWMG7x/podcast-woman.png",
    "https://replicate.delivery/pbxt/O61S8cEIMPpMwEOkXnrroou1JkzoVFa0JJuhXHt05hBQ8AUq/replicate-prediction-50s6t1510hrma0ct2v5vj7jk2m.jpg"
  ],
  "aspect_ratio": "4:3",
  "output_format": "png",
  "safety_filter_level": "block_only_high"
}
```

#### Output

```json
"https://replicate.delivery/xezq/JACsWhU1EWoJIZ4OunufCh2kkixbJIl7sW8vtFjGZ8x3Ko1KA/tmpt2fb5g_i.png"
```


### Example (https://replicate.com/p/05zezj1yhsrmy0cwezer4a9214)

#### Input

```json
{
  "prompt": "A hand-lettered chalkboard menu for an artisan bakery with items like 'Sourdough Loaf $8', 'Croissant $4', 'Pain au Chocolat $5', decorated with chalk drawings of bread and wheat",
  "aspect_ratio": "3:4"
}
```

#### Output

```json
"https://replicate.delivery/xezq/YrebWwuekJqefRnidhY8vGemgcpcyJn456oK9BVHOMvbibKxC/tmps8lb5tkd.jpeg"
```


### Example (https://replicate.com/p/fejvqvrbfxrmr0cwezg943z8j0)

#### Input

```json
{
  "prompt": "A photorealistic product shot of a luxury perfume bottle on a marble surface, with soft bokeh lights in the background and the brand name 'AURORA' elegantly engraved on the glass",
  "aspect_ratio": "1:1"
}
```

#### Output

```json
"https://replicate.delivery/xezq/oyp30f04wF3UMS84W3Z1jHtKABqoRVyNPCCzTp8bLK0jupELA/tmpx1os3j37.jpeg"
```


### Example (https://replicate.com/p/re4hvqqycdrmt0cwezg8pqgger)

#### Input

```json
{
  "prompt": "A retro-futuristic movie poster for a sci-fi film called 'STELLAR DRIFT' with bold typography, a lone astronaut floating above a ringed planet, and the tagline 'Beyond the edge of everything'",
  "aspect_ratio": "3:4"
}
```

#### Output

```json
"https://replicate.delivery/xezq/rOGPIa6tMzZpB5jIDrJVLuuGBlbUNvwYDp5g6PCC9Vml3UiF/tmpeuwez0k1.jpeg"
```


### Example (https://replicate.com/p/ycb3qn01cxrmt0cwezgsx77sdr)

#### Input

```json
{
  "prompt": "A children's book illustration of a friendly robot and a little girl planting flowers together in a garden, with butterflies and a rainbow in the background, in a soft pastel watercolor style",
  "aspect_ratio": "1:1"
}
```

#### Output

```json
"https://replicate.delivery/xezq/NMkeJdepNbkJHEiA6beeceTeXffd3NvJO81d9W1gJOiCAfmSsA/tmp0j8x348s.jpeg"
```


### Example (https://replicate.com/p/qje31bg4wdrmy0cwezgrm53hj0)

#### Input

```json
{
  "prompt": "A hyper-detailed architectural rendering of a modern treehouse hotel suite suspended between giant redwood trees, with floor-to-ceiling glass walls, a wraparound deck, and warm interior lighting at dusk",
  "resolution": "4K",
  "aspect_ratio": "16:9"
}
```

#### Output

```json
"https://replicate.delivery/xezq/cMfTciYKGnxzT6aXTERKiHQqfyMfroiy26JYM4JjmiqW9mSsA/tmpvyuq9exm.jpeg"
```


### Example (https://replicate.com/p/yqjare07qsrmt0cwezgv4mazgr)

#### Input

```json
{
  "prompt": "An infographic poster about the solar system showing each planet with its name, distance from the sun, and key facts, in a modern flat design style with a dark navy background",
  "aspect_ratio": "9:16"
}
```

#### Output

```json
"https://replicate.delivery/xezq/Gx1u3g3R6vbGHdklQV3XR14WgzRrb4kjEeG3uqkpaRRavpELA/tmpcp9ppxdr.jpeg"
```


### Example (https://replicate.com/p/rm9y69nv95rmr0cwezhb1jy68w)

#### Input

```json
{
  "prompt": "A neon-lit cyberpunk street food stall in Tokyo at night, with Japanese text on the signs reading '\u30e9\u30fc\u30e1\u30f3' and steam rising from bowls of ramen",
  "aspect_ratio": "16:9"
}
```

#### Output

```json
"https://replicate.delivery/xezq/Yp8JF6ye4J03Uibl7w1v1AUOv1KmAh4gd8gwhx837s3ffmSsA/tmp1lhxa48t.jpeg"
```


### Example (https://replicate.com/p/2nj8h5e08srmw0cwezhanma7h0)

#### Input

```json
{
  "prompt": "A vintage botanical illustration of a cactus with a handwritten label 'Cereus peruvianus' in elegant calligraphy, on aged parchment paper with watercolor stains",
  "aspect_ratio": "3:4"
}
```

#### Output

```json
"https://replicate.delivery/xezq/sHB9bheRffMJKJ1VfcQh3iCNSwJswereiTXCSMBPEvIpA4UiF/tmpq1xrknx0.jpeg"
```


### Example (https://replicate.com/p/ccgcdceh75rmt0cwezha9csg6g)

#### Input

```json
{
  "prompt": "Transform this coffee shop scene into a Van Gogh Starry Night inspired painting, keeping the same composition but with swirling brushstrokes and vibrant blues and yellows",
  "image_input": [
    "https://replicate.delivery/xezq/LOB8lf7PV81RfUcAqkPBeuZ9J4DE20XyH1Z6Mk7nRTZtxmSsA/tmpwa9w0ve8.jpeg"
  ]
}
```

#### Output

```json
"https://replicate.delivery/xezq/DQe7exuyGJlaeoxrn6sajerBpWEQ7nWxxeugP9KNvGK0f3UiF/tmpf4mzxsjs.jpeg"
```


### Example (https://replicate.com/p/3w7fzh6rfhrmt0cwezh9pg7vnc)

#### Input

```json
{
  "prompt": "A fashion magazine cover with the title 'VOGUE' at the top, featuring an elegant woman in a red silk gown standing in front of the Eiffel Tower at sunset, with the cover line 'Paris Fashion Week 2025'",
  "aspect_ratio": "3:4"
}
```

#### Output

```json
"https://replicate.delivery/xezq/Ukz9MVmGI9IdC5h4CPITv2DWMnFizaGS9LJ7tyLauRdfvpELA/tmpxv37bpfz.jpeg"
```


### Example (https://replicate.com/p/f60rh06yfsrmy0cwezhaz42qjr)

#### Input

```json
{
  "prompt": "A step-by-step recipe infographic for making chocolate chip cookies, with 6 illustrated steps, ingredient quantities labeled, and the title 'Perfect Chocolate Chip Cookies' in a hand-drawn font",
  "aspect_ratio": "9:16"
}
```

#### Output

```json
"https://replicate.delivery/xezq/ZODOZNhRJbKJBx8YXOjAet1fewxrU8GalyQ5sSXshuNeAOlYB/tmpm106wt98.jpeg"
```


### Example (https://replicate.com/p/pj50sn9ax9rmw0cwezjrtfcbf0)

#### Input

```json
{
  "prompt": "A fantasy map of a kingdom called 'Everwood' with labeled regions, old cartography style, compass rose",
  "aspect_ratio": "4:3"
}
```

#### Output

```json
"https://replicate.delivery/xezq/JEfnuPkSg5xTWyC9fv69VKFusJ1sM756JVoAt0zcMUSWiTJWA/tmplyli6lgt.jpeg"
```


### Example (https://replicate.com/p/r8hcwxyrdhrmw0cwezjrkq3130)

#### Input

```json
{
  "prompt": "Remove the cat from the armchair and replace it with a stack of old leather-bound books",
  "image_input": [
    "https://replicate.delivery/xezq/LOB8lf7PV81RfUcAqkPBeuZ9J4DE20XyH1Z6Mk7nRTZtxmSsA/tmpwa9w0ve8.jpeg"
  ]
}
```

#### Output

```json
"https://replicate.delivery/xezq/H3pBqoWV48ZFA5fbK3uE2QPeDYSZIaw1wuUJ7YSaMHlOjTJWA/tmp0r70v0ew.jpeg"
```


### Example (https://replicate.com/p/6d1yp9pv7srmr0cwezjsxnf8gr)

#### Input

```json
{
  "prompt": "A business card for 'Marina Chen, Creative Director' at 'Prism Studio', clean modern layout, teal and gold geometric pattern",
  "aspect_ratio": "16:9"
}
```

#### Output

```json
"https://replicate.delivery/xezq/9tOBM1G5SpK0A9qdlrt4lNbH3QXABp3d4GSLIdgePLeMjTJWA/tmp59uislvp.jpeg"
```


### Example (https://replicate.com/p/bwd690z0r1rmw0cwezjrr6bme0)

#### Input

```json
{
  "prompt": "A modern minimalist Scandinavian living room with a large window overlooking snowy mountains, warm wood, cozy fireplace",
  "aspect_ratio": "16:9"
}
```

#### Output

```json
"https://replicate.delivery/xezq/SUmjXYaYHF5pG1yVm2VxB17liqw9jvg9cWMTGBzHR3Gw4UiF/tmpfb9ns6ws.jpeg"
```


## Model readme

> # Nano Banana Pro
> 
> Generate and edit images with accurate text, advanced reasoning, and professional-grade creative controls.
> 
> Nano Banana Pro is Google DeepMind's image generation and editing model built on Gemini 3 Pro. It creates detailed visuals with legible text in multiple languages, connects to real-time information from Google Search, and gives you studio-quality control over every aspect of your images.
> 
> ## What can you do with it
> 
> **Create images with accurate, legible text**
> 
> Nano Banana Pro is particularly good at rendering text directly in images. You can generate posters, mockups, infographics, and diagrams with clear typography in multiple languages. The model understands depth and nuance, so it can create text with varied textures, fonts, and calligraphy styles.
> 
> **Generate context-rich visuals from real-world knowledge**
> 
> The model uses Gemini 3 Pro's reasoning capabilities to create accurate educational content, infographics, and diagrams. It can connect to Google Search to pull in real-time information like recipes, weather data, or sports scores, then visualize that information for you.
> 
> **Blend multiple images with consistent results**
> 
> You can combine up to 14 images in a single composition while maintaining consistency and resemblance of up to 5 people. This makes it useful for turning sketches into products, creating lifestyle scenes, or building surreal compositions from multiple elements.
> 
> **Exercise professional creative control**
> 
> Nano Banana Pro offers advanced editing capabilities that let you adjust camera angles, change scene lighting (like turning day into night), apply color grading, modify depth of field, and edit specific parts of an image while keeping everything else intact. You can generate images in various aspect ratios and at resolutions up to 4K.
> 
> ## Example uses
> 
> **Typography and branding**
> 
> Create logos where letters convey meaning visually, generate posters with retro screen-printed textures, or build city scenes where buildings form letters that spell words.
> 
> **Multilingual content**
> 
> Generate text in one language, then translate it to another while keeping all other visual elements the same. This helps you localize marketing materials, posters, or product packaging.
> 
> **Educational content**
> 
> Turn handwritten notes into diagrams, create step-by-step infographics for recipes or tutorials, or generate detailed educational explainers about plants, animals, or other subjects.
> 
> **Product mockups and prototypes**
> 
> Blend sketches with product photos, create photorealistic renderings from blueprints, or generate lifestyle product shots with consistent branding across different settings.
> 
> **Creative transformations**
> 
> Change the aspect ratio of an image while keeping subjects in position, apply dramatic lighting effects, shift focus to specific elements, or transform the mood by adjusting time of day and atmosphere.
> 
> ## How it works
> 
> Nano Banana Pro uses Gemini 3 Pro's advanced reasoning and real-world knowledge to understand what you want to create. When you provide a prompt, the model considers context, spatial relationships, composition, and style to generate images that match your intent. Its multilingual capabilities come from Gemini 3 Pro's enhanced language understanding, which helps it render accurate text across different writing systems.
> 
> The model can access Google Search when you need current information or specific facts, making it more accurate for data-driven visualizations and infographics.
> 
> ## Things to keep in mind
> 
> Like all large language models, Nano Banana Pro may sometimes produce inaccurate or unexpected results. When generating infographics or data visualizations, verify the factual accuracy of the output. Text generation is strong across many languages, but you might occasionally see issues with grammar, spelling, or cultural nuances in specific languages.
> 
> Advanced features like masked editing, major lighting changes, or blending many images can sometimes produce visual artifacts or unnatural results. Character consistency is generally reliable but not perfect every time.
> 
> All images generated by Nano Banana Pro include SynthID watermarks, Google's imperceptible digital watermarking technology for identifying AI-generated content.
> 
> This model is very popular and may at times be at capacity. If you click the allow_fallback_model checkbox we will route your requests into the model listed next to the checkbox if Nano Banana Pro is at capacity. You will be charged the price of that model.
> 
> ## Try it yourself
> 
> You can try Nano Banana Pro on the [Replicate Playground](https://replicate.com/playground)
> 
> Try out the other [Google models here](https://replicate.com/google)


Input schema
Table
JSON
{
  "type": "object",
  "title": "Input",
  "required": [
    "prompt"
  ],
  "properties": {
    "prompt": {
      "type": "string",
      "title": "Prompt",
      "x-order": 0,
      "description": "A text description of the image you want to generate"
    },
    "resolution": {
      "enum": [
        "1K",
        "2K",
        "4K"
      ],
      "type": "string",
      "title": "resolution",
      "description": "Resolution of the generated image",
      "default": "2K",
      "x-order": 3
    },
    "image_input": {
      "type": "array",
      "items": {
        "type": "string",
        "format": "uri"
      },
      "title": "Image Input",
      "default": [],
      "x-order": 1,
      "description": "Input images to transform or use as reference (supports up to 14 images)"
    },
    "aspect_ratio": {
      "enum": [
        "match_input_image",
        "1:1",
        "2:3",
        "3:2",
        "3:4",
        "4:3",
        "4:5",
        "5:4",
        "9:16",
        "16:9",
        "21:9"
      ],
      "type": "string",
      "title": "aspect_ratio",
      "description": "Aspect ratio of the generated image",
      "default": "match_input_image",
      "x-order": 2
    },
    "output_format": {
      "enum": [
        "jpg",
        "png"
      ],
      "type": "string",
      "title": "output_format",
      "description": "Format of the output image",
      "default": "jpg",
      "x-order": 4
    },
    "safety_filter_level": {
      "enum": [
        "block_low_and_above",
        "block_medium_and_above",
        "block_only_high"
      ],
      "type": "string",
      "title": "safety_filter_level",
      "description": "block_low_and_above is strictest, block_medium_and_above blocks some prompts, block_only_high is most permissive but some prompts will still be blocked",
      "default": "block_only_high",
      "x-order": 5
    },
    "allow_fallback_model": {
      "type": "boolean",
      "title": "Allow Fallback Model",
      "default": false,
      "x-order": 6,
      "description": "Fallback to another model (currently bytedance/seedream-5) if Nano Banana Pro is at capacity."
    }
  }
}

Copy
Output schema
Table
JSON
{
  "type": "string",
  "title": "Output",
  "format": "uri"
}


///

///
## Basic model info

Model name: google/nano-banana-2
Model description: Google's fast image generation model with conversational editing, multi-image fusion, and character consistency


## Model inputs

- prompt (required): A text description of the image you want to generate (string)
- image_input (optional): Input images to transform or use as reference (supports up to 14 images) (array)
- aspect_ratio (optional): Aspect ratio of the generated image (string)
- resolution (optional): Resolution of the generated image. Higher resolutions take longer to generate. (string)
- google_search (optional): Use Google Web Search grounding to generate images based on real-time information (e.g. weather, sports scores, recent events). (boolean)
- image_search (optional): Use Google Image Search grounding to find web images as visual context for generation. When enabled, web search is also used automatically. (boolean)
- output_format (optional): Format of the output image (string)


## Model output schema

{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/pazq5tpd7xrmr0cwkbb8ek35pr)

#### Input

```json
{
  "prompt": "Create a picture of a nano banana 2 dish in a fancy restaurant with a Replicate theme",
  "image_input": [],
  "aspect_ratio": "match_input_image",
  "output_format": "jpg"
}
```

#### Output

```json
"https://replicate.delivery/xezq/PNicQdZsGyLWNpXvNX4pqiaaotTP5j23J9cSyTuReLpLVxFLA/tmpx6zdponu.jpeg"
```


### Example (https://replicate.com/p/bca2qphr91rmw0cwkbb9ped188)

#### Input

```json
{
  "prompt": "a golden retriever puppy playing in autumn leaves, warm sunlight"
}
```

#### Output

```json
"https://replicate.delivery/xezq/0plMmeVefCSxxJV8MvxSWcIpzg08BRJX6pA9vKRJO02zTFXsA/tmp5hj7uutl.jpeg"
```


### Example (https://replicate.com/p/5cjmq0082hrmt0cwkbq8djs220)

#### Input

```json
{
  "prompt": "Anime character design, full color, concept sketch against white. Just the characters, no other sketches or words. A young adult man and woman on their phones, sitting cross legged, back to back. Pick interesting fashion choices, hair style and unusual footwear.",
  "image_input": [],
  "aspect_ratio": "1:1",
  "output_format": "jpg"
}
```

#### Output

```json
"https://replicate.delivery/xezq/TZKrfYQ0XjUTKC5yAB1xV2HIQC1NIDYx4OXs1aGvCD1HhxFLA/tmp54fifmcm.jpeg"
```


### Example (https://replicate.com/p/gd6jm64pc1rmw0cwkbtrame0tm)

#### Input

```json
{
  "prompt": "A photorealistic close-up portrait of an elderly Japanese ceramicist with deep wrinkles and a warm smile, carefully inspecting a freshly glazed tea bowl in his rustic sun-drenched workshop. Soft golden hour light streams through a window, highlighting the texture of the clay. Shot with an 85mm portrait lens, shallow depth of field with creamy bokeh.",
  "aspect_ratio": "3:4"
}
```

#### Output

```json
"https://replicate.delivery/xezq/IigIzxqBovIzM5GIkBm6Ef3LVeuT0djhy464hZdQHF8AKjLWA/tmpaiuubx6q.jpeg"
```


### Example (https://replicate.com/p/xycfvywebhrmw0cwkbvbz4sa6m)

#### Input

```json
{
  "prompt": "A kawaii-style sticker of a happy red panda wearing a tiny bamboo hat, munching on a green bamboo leaf. Bold clean outlines, simple cel-shading, vibrant color palette. White background.",
  "aspect_ratio": "1:1"
}
```

#### Output

```json
"https://replicate.delivery/xezq/qnWLBLoTfV0vNSYB127ZEm6JMoOFNvdrWBZd4r4zTh4dlxFLA/tmp2oqfsqal.jpeg"
```


### Example (https://replicate.com/p/f6q14t3pasrmw0cwkbvr5ygnz0)

#### Input

```json
{
  "prompt": "A scientifically accurate cross-section infographic of the human eye, with clean labels pointing to the cornea, iris, pupil, lens, retina, and optic nerve. Modern flat design style with a dark navy background and bright accent colors. Title reads 'ANATOMY OF THE HUMAN EYE' in a clean sans-serif font at the top.",
  "aspect_ratio": "16:9"
}
```

#### Output

```json
"https://replicate.delivery/xezq/6mD39k2BFyIAFlO3WJqx8hIZ2Yp4e2ALoM1qJeQz0A64LjLWA/tmppsnii9dg.jpeg"
```


### Example (https://replicate.com/p/5epfabq5zhrmw0cwkbvvbe7fr4)

#### Input

```json
{
  "prompt": "A cinematic wide shot of a lone astronaut standing on the surface of Mars, looking up at Earth visible in the dusty orange sky. Dramatic rim lighting from the setting sun creates a silhouette. Sci-fi atmosphere, photorealistic. Anamorphic lens flare.",
  "aspect_ratio": "16:9"
}
```

#### Output

```json
"https://replicate.delivery/xezq/a6ZAPpRP0jKNCxBigH8HosbwZf2FtsnpPX5715yCjoiKmxFLA/tmpvkyyuodm.jpeg"
```


### Example (https://replicate.com/p/8pn0xwawd9rmt0cwkbw8wdhpz0)

#### Input

```json
{
  "prompt": "A watercolor painting of a Venetian canal at dawn. Gondolas are moored along weathered stone walls. Soft pastel reflections shimmer on the water. Loose, expressive brushstrokes with visible paper texture. Warm golden and cool blue tones.",
  "aspect_ratio": "3:2"
}
```

#### Output

```json
"https://replicate.delivery/xezq/dYKsIq3ekWXwE6UweedeDWSAaAJNr1CWk2vbYwS7hXjXzMuYB/tmp3t1o4coa.jpeg"
```


### Example (https://replicate.com/p/bx55z76pc9rmt0cwkbwbv8601r)

#### Input

```json
{
  "prompt": "A modern minimalist logo for a sustainable coffee brand called 'EVERGREEN ROASTERS'. The logo features a stylized coffee leaf integrated with a coffee bean. Clean geometric lines, forest green and cream color scheme. White background.",
  "aspect_ratio": "1:1"
}
```

#### Output

```json
"https://replicate.delivery/xezq/NKeJ1uwvfwsCFkb58grsKRBVExxF5acafVeoIUlIeKnJqZcxC/tmpmwiwv6gk.jpeg"
```


### Example (https://replicate.com/p/sty1jqtjc5rmt0cwkbwvm4hmtm)

#### Input

```json
{
  "prompt": "Transform this photograph into a Studio Ghibli anime style illustration. Keep the same composition but render everything with soft cel-shading, warm colors, and the dreamy atmosphere of a Miyazaki film.",
  "image_input": [
    "https://replicate.delivery/xezq/Res3dPZneqnk9E9z0qrPtIQchh0cc36J385ISGlJd3eeQLuYB/tmpcc4o9c5a.jpeg"
  ],
  "aspect_ratio": "match_input_image"
}
```

#### Output

```json
"https://replicate.delivery/xezq/Rh8hOr979h45BZnyYAMb12xy5Ef2ZIEPheIEwja3aOl4NjLWA/tmpnc9vxl6b.jpeg"
```


### Example (https://replicate.com/p/z92xaxpyhsrmw0cwkbwrm6jq8w)

#### Input

```json
{
  "prompt": "A 3-panel comic strip in a clean, modern cartoon style. Panel 1: A programmer stares at their screen with a confused expression, coffee cup in hand. Panel 2: The programmer's eyes widen as they spot the bug. Panel 3: The programmer celebrates with arms raised, confetti falls, and the screen shows a green checkmark. Caption at the bottom reads 'THE DEBUGGING EXPERIENCE'.",
  "aspect_ratio": "16:9"
}
```

#### Output

```json
"https://replicate.delivery/xezq/YRmQpEdlIs6ULZPLTEiYh2Nd153SCW1IlssGry5FeWeZOjLWA/tmp_9laf92c.jpeg"
```


### Example (https://replicate.com/p/61egkqv1v9rmt0cwkbxbzw766w)

#### Input

```json
{
  "prompt": "An isometric 3D miniature diorama of a cozy Japanese ramen shop at night. Warm light spills from the entrance. Tiny detailed figures sit at the counter. Steam rises from bowls of ramen. Rain puddles reflect neon signs on the street. Tilt-shift photography effect.",
  "aspect_ratio": "1:1"
}
```

#### Output

```json
"https://replicate.delivery/xezq/aW4vaIf7HUzcXqnlgGeyic1l1eH0zUrRxNGtwcdDYOfu7MuYB/tmp7ag51byn.jpeg"
```


## Model readme

> Nano Banana 2 is Google's latest image generation model, built on Gemini 3.1 Flash Image. It's the high-efficiency counterpart to [Nano Banana Pro](https://replicate.com/google/nano-banana-pro) — optimized for speed and high-volume use cases while still producing high-fidelity images.
> 
> Google [announced Nano Banana 2](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-nano-banana-2/) on February 26, 2026, describing it as their "best image generation and editing model" — combining Pro-level visual quality with Flash-level speed and pricing.
> 
> ## What it can do
> 
> **Generate images from text.** Describe what you want and the model creates it — photorealistic scenes, illustrations, product mockups, whatever you need.
> 
> ![A cozy café interior at golden hour](https://replicate.delivery/xezq/Res3dPZneqnk9E9z0qrPtIQchh0cc36J385ISGlJd3eeQLuYB/tmpcc4o9c5a.jpeg)
> 
> **Render text accurately.** One of the standout improvements over previous Flash image models — text in images is crisp and readable, with support for multiple languages.
> 
> 
> **Edit existing images.** Pass in one or more images along with a text prompt to transform them — change backgrounds, swap colors, adjust styles, or combine multiple images into one scene.
> 
> **Use up to 14 reference images.** Feed in multiple images for style transfer, image combination, or complex editing tasks that draw on several visual references at once.
> 
> ## Key improvements over the original Nano Banana
> 
> - Higher fidelity output with richer textures and sharper details
> - Much better text rendering and multilingual support
> - Stronger instruction following for complex prompts
> - New aspect ratios: 1:4, 4:1, 1:8, and 8:1 (in addition to the standard set)
> - Multiple output resolutions: 512px, 1K, 2K, and 4K
> 
> ## Aspect ratios
> 
> Supports `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, and `21:9`. Set `match_input_image` to automatically match the aspect ratio of your input image.
> 
> ## Output format
> 
> Choose between `jpg` (default) and `png`.
> 
> ## Links
> 
> - [Google's announcement blog post](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-nano-banana-2/)
> - [Gemini 3.1 Flash Image API docs](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image-preview)
> - [Image generation guide](https://ai.google.dev/gemini-api/docs/image-generation)
> 
> You can try Nano Banana 2 on the [Replicate playground](https://replicate.com/playground).


Input schema
Table
JSON
{
  "type": "object",
  "title": "Input",
  "required": [
    "prompt"
  ],
  "properties": {
    "prompt": {
      "type": "string",
      "title": "Prompt",
      "x-order": 0,
      "description": "A text description of the image you want to generate"
    },
    "resolution": {
      "enum": [
        "1K",
        "2K",
        "4K"
      ],
      "type": "string",
      "title": "resolution",
      "description": "Resolution of the generated image. Higher resolutions take longer to generate.",
      "default": "1K",
      "x-order": 3
    },
    "image_input": {
      "type": "array",
      "items": {
        "type": "string",
        "format": "uri"
      },
      "title": "Image Input",
      "default": [],
      "x-order": 1,
      "description": "Input images to transform or use as reference (supports up to 14 images)"
    },
    "aspect_ratio": {
      "enum": [
        "match_input_image",
        "1:1",
        "1:4",
        "1:8",
        "2:3",
        "3:2",
        "3:4",
        "4:1",
        "4:3",
        "4:5",
        "5:4",
        "8:1",
        "9:16",
        "16:9",
        "21:9"
      ],
      "type": "string",
      "title": "aspect_ratio",
      "description": "Aspect ratio of the generated image",
      "default": "match_input_image",
      "x-order": 2
    },
    "image_search": {
      "type": "boolean",
      "title": "Image Search",
      "default": false,
      "x-order": 5,
      "description": "Use Google Image Search grounding to find web images as visual context for generation. When enabled, web search is also used automatically."
    },
    "google_search": {
      "type": "boolean",
      "title": "Google Search",
      "default": false,
      "x-order": 4,
      "description": "Use Google Web Search grounding to generate images based on real-time information (e.g. weather, sports scores, recent events)."
    },
    "output_format": {
      "enum": [
        "jpg",
        "png"
      ],
      "type": "string",
      "title": "output_format",
      "description": "Format of the output image",
      "default": "jpg",
      "x-order": 6
    }
  }
}

Copy
Output schema
Table
JSON
{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

///