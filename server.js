const express = require('express');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require("path");
const sqlite3 = require('sqlite3').verbose();
const serveStatic = require("serve-static");
const { readFileSync } = require('fs');
const { setupFdk } = require("@gofynd/fdk-extension-javascript/express");
const { SQLiteStorage } = require("@gofynd/fdk-extension-javascript/express/storage");
const sqliteInstance = new sqlite3.Database('session_storage.db');
const productRouter = express.Router();
const { OpenAI } = require("openai");
const { postStory } = require('./instagramService');
const { generateAndUploadImage } = require('./utils/helpers'); // Adjust the path as necessary
const INSTAGRAM_CALL_BACK_DOMAIN='https://aa09-2409-40c0-105a-a54a-38c2-ac55-48bd-e576.ngrok-free.app'

// Hypothetical import for an image generation API
// const { ImageGenerationApi } = require("image-generation-api");

const fdkExtension = setupFdk({
    api_key: process.env.EXTENSION_API_KEY,
    api_secret: process.env.EXTENSION_API_SECRET,
    base_url: process.env.EXTENSION_BASE_URL,
    cluster: process.env.FP_API_DOMAIN,
    callbacks: {
        auth: async (req) => {
            // Write you code here to return initial launch url after auth process complete
            if (req.query.application_id)
                return `${req.extension.base_url}/company/${req.query['company_id']}/application/${req.query.application_id}`;
            else
                return `${req.extension.base_url}/company/${req.query['company_id']}`;
        },
        
        uninstall: async (req) => {
            // Write your code here to cleanup data related to extension
            // If task is time taking then process it async on other process.
        }
    },
    storage: new SQLiteStorage(sqliteInstance,"exapmple-fynd-platform-extension"), // add your prefix
    access_mode: "online",
    webhook_config: {
        api_path: "/api/webhook-events",
        notification_email: "useremail@example.com",
        event_map: {
            "company/product/delete": {
                "handler": (eventName) => {  console.log(eventName)},
                "version": '1'
            }
        }
    },
});

const STATIC_PATH = process.env.NODE_ENV === 'production'
    ? path.join(process.cwd(), 'frontend', 'public' , 'dist')
    : path.join(process.cwd(), 'frontend');
    
const app = express();
const platformApiRoutes = fdkExtension.platformApiRoutes;

// Middleware to parse cookies with a secret key
app.use(cookieParser("ext.session"));

// Middleware to parse JSON bodies with a size limit of 2mb
app.use(bodyParser.json({
    limit: '2mb'
}));

// Serve static files from the React dist directory
app.use(serveStatic(STATIC_PATH, { index: false }));

// FDK extension handler and API routes (extension launch routes)
app.use("/", fdkExtension.fdkHandler);

// Route to handle webhook events and process it.
app.post('/api/webhook-events', async function(req, res) {
    try {
      console.log(`Webhook Event: ${req.body.event} received`)
      await fdkExtension.webhookRegistry.processWebhook(req);
      return res.status(200).json({"success": true});
    } catch(err) {
      console.log(`Error Processing ${req.body.event} Webhook`);
      return res.status(500).json({"success": false});
    }
});

// Instagram OAuth routes
app.get('/publish', async (req, res) => {
    try {
        const requiredParams = ['ImageUrl', 'caption', 'hashTags', 'productLink'];
        const missingParams = requiredParams.filter(param => !req.query[param]);

        if (missingParams.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Missing required parameters: ${missingParams.join(', ')}`
            });
        }

        // Define your parameters
        const params = new URLSearchParams({
            ImageUrl: req.query.ImageUrl,
            caption: req.query.caption,
            hashTags: req.query.hashTags,
            productLink: req.query.productLink
        });

        // Using the correct Instagram Basic Display API endpoint
        const callbackUrl = new URL(`/api/instagram/post?${params.toString()}`, INSTAGRAM_CALL_BACK_DOMAIN).toString();
        console.log("Callback URL ======> ", callbackUrl);

        const instagramAuthUrl = 'https://api.instagram.com/oauth/authorize?' + new URLSearchParams({
            client_id: process.env.INSTAGRAM_CLIENT_ID,
            redirect_uri: callbackUrl,
            scope: 'instagram_business_basic,instagram_business_content_publish',
            response_type: 'code'
        }).toString();

        console.log("instagramAuthUrl ======> ", instagramAuthUrl);

        res.redirect(instagramAuthUrl);
    } catch (error) {
        console.error('Instagram OAuth error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initiate Instagram authorization'
        });
    }
});

// Callback endpoint that receives the code
app.get('/api/instagram/post', async (req, res) => {
    const { code, ImageUrl, caption, hashTags, productLink } = req.query;
    
    if (!code) {
        return res.status(400).json({ error: 'Authorization code not received' });
    }

    try {
        // Exchange the code for an access token
        const callbackUrl = new URL('/api/instagram/post', INSTAGRAM_CALL_BACK_DOMAIN).toString();
        const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', {
            client_id: process.env.INSTAGRAM_CLIENT_ID,
            client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: callbackUrl,
            code: code
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, user_id } = tokenResponse.data;

        try {
            const storyData = {
                accessToken: access_token,
                imageUrl: ImageUrl,
                userId: user_id,
                caption: caption,
                hashtags: hashTags.split(','), // Assuming hashTags is a comma-separated string
                link: {
                    url: productLink,
                    linkText: "Shop Now"
                }
            };

            console.log("storyData", storyData)
            // Post story using the imported service
            const storyResult = await postStory(storyData);

            // Return success response with all data
            res.json(storyResult);

        } catch (storyError) {
            console.error('Story posting error:', storyError);
            res.status(500).json(storyError);
        }
        
    } catch (error) {
        console.error('Instagram OAuth error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to process Instagram authorization',
            details: error.response?.data || error.message
        });
    }
});

productRouter.get('/', async function view(req, res, next) {
    try {
        const {
            platformClient
        } = req;
        const data = await platformClient.catalog.getProducts()
        console.log("hiii")
        return res.json(data);
    } catch (err) {
        next(err);
    }
});

// Get products list for application
productRouter.get('/application/:application_id', async function view(req, res, next) {
    try {
        const {
            platformClient
        } = req;
        const { application_id } = req.params;
        const data = await platformClient.application(application_id).catalog.getAppProducts()
        return res.json(data);
    } catch (err) {
        next(err);
    }
});

// FDK extension api route which has auth middleware and FDK client instance attached to it.
platformApiRoutes.use('/products', productRouter);

// If you are adding routes outside of the /api path, 
// remember to also add a proxy rule for them in /frontend/vite.config.js
app.use('/api', platformApiRoutes);

// Dummy API endpoint
app.get('/api/hashtags', (req, res) => {
    const hashtags = [
        { id: 1, tag: "#example" },
        { id: 2, tag: "#hashtag" },
        { id: 3, tag: "#fdk" }
    ];
    const hashtagTags = hashtags.map(hashtag => hashtag.tag);
    res.json({ items: hashtagTags });
});

// Initialize the OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Hypothetical configuration for the image generation API
// const imageApiConfig = new ImageGenerationApi({
//   apiKey: process.env.IMAGE_API_KEY,
// });

app.post('/api/generate-content', async (req, res) => {
    const products = req.body.products; // Expecting an array of products
    console.log("products", products);

  // Construct the prompt for text generation
  // [ { brandName: 'Generic', categoryName: 'others-level-3' } ]
  const textPrompt = products.map(product => 
    `Create a good background, captions and hashtags for an Instagram story advertisement for the product "${product.brandName}" and category "${product.categoryName}". Include captions and hashtags.`
  ).join("\n");
  const tuning = "A clean, modern Instagram story background for a trendy sneaker. The design should include space at the center for the product image overlay. Vibrant, high-contrast, and eye-catching."

  const instructions = `Provide data in only JSON format. With just two keys. hashtags, captions: each must be a array`;
  const instructions_2 = "5 captions and 5 hashtags"


  var final_prompt = `${textPrompt}\n${tuning}\n${instructions}\n${instructions_2}`;

    try {
        console.log("textPrompttttttttt", final_prompt)
        console.log("Generating content...");


        const textResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: final_prompt }],
            max_tokens: 150,
            temperature: 0.7
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            }
        });

        // Ensure response structure is correct
        const generatedText = textResponse.data?.choices?.[0]?.message?.content?.trim();

        if (!generatedText) {
            throw new Error("OpenAI API response did not contain expected text.");
    }
        console.log("type of generated text", typeof generatedText)
        console.log("generatedText", textResponse)
        console.log("textResponseeeee", textResponse)
        console.log("choicessss", textResponse.data.choices[0])

        let parsedContent;
        try {
            parsedContent = JSON.parse(generatedText);
        } catch (parseError) {
            console.error("Error parsing generated text as JSON:", parseError);
            return res.status(500).json({ error: "Failed to parse generated content" });
        }

        // Generate an image using the helper function
        const image_desc = "image must be reliable, since it will affect busines, nothing too fancy, something related to the brand and its theme and simple, good for eyes."
        var image_prompt = `${textPrompt}\n${tuning}\n${image_desc}`
        const imageUrl = await generateAndUploadImage(image_prompt);

        // Combine text and image responses
        console.log("parsedContent", parsedContent, parsedContent.hashtags, parsedContent.captions);
        console.log("imageUrl", imageUrl)
        if (imageUrl && parsedContent.captions && parsedContent.hashtags) {
        
            res.json({
                success: true,
                captions: parsedContent.captions,
                hashtags: parsedContent.hashtags,
                imageUrl: imageUrl
            });
        } 
        else {
            res.status(400).json({ error: "Failed to generate content" });
        }
    } catch (error) {
        console.error("Error generating content:", error);
        res.status(500).json({ error: "Failed to generate content" });
    }
});

// Serve the React app for all other routes
app.get('*', (req, res) => {
    return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(path.join(STATIC_PATH, "index.html")));
});

module.exports = app;
