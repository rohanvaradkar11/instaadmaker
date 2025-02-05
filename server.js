const express = require('express');
const cookieParser = require('cookie-parser');
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
        // Using the correct Instagram Basic Display API endpoint
        const instagramAuthUrl = 'https://api.instagram.com/oauth/authorize?' + new URLSearchParams({
            client_id: process.env.INSTAGRAM_CLIENT_ID,
            redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
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
    // console.log("Here in publish route................")
    // const instagramAuthUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.INSTAGRAM_REDIRECT_URI)}&scope=user_profile,user_media&response_type=code`;
    // console.log("instagramAuthUrl ======> ", instagramAuthUrl);
    // res.redirect(instagramAuthUrl);
});

// Add a new endpoint to post to Instagram
app.post('/api/instagram/post', async (req, res) => {
    try {
        const { accessToken, mediaUrl, caption } = req.body;

        // Create a container for the media
        const containerResponse = await axios.post(`https://graph.instagram.com/v12.0/me/media`, {
            image_url: mediaUrl,
            caption: caption,
            access_token: accessToken
        });

        // Publish the container
        const publishResponse = await axios.post(`https://graph.instagram.com/v12.0/me/media_publish`, {
            creation_id: containerResponse.data.id,
            access_token: accessToken
        });

        res.json({
            success: true,
            data: publishResponse.data
        });

    } catch (error) {
        console.error('Instagram posting error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to post to Instagram'
        });
    }
});

// Callback endpoint that receives the code
app.get('/insta/login/callback', async (req, res) => {
    const { code } = req.query;
    console.log("Authorization code received:", code);
    
    if (!code) {
        return res.status(400).json({ error: 'Authorization code not received' });
    }

    try {
        // Exchange the code for an access token
        const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', {
            client_id: process.env.INSTAGRAM_CLIENT_ID,
            client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
            code: code
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, user_id } = tokenResponse.data;

        // Get user details
        const userResponse = await axios.get(`https://graph.instagram.com/v12.0/${user_id}?fields=id,username&access_token=${access_token}`);

        res.json({
            success: true,
            data: {
                accessToken: access_token,
                userId: user_id,
                username: userResponse.data.username
            }
        });
        
    } catch (error) {
        console.error('Instagram OAuth error:', error);
        res.status(500).json({ error: 'Failed to process Instagram authorization' });
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

  // Construct the prompt for text generation
  const textPrompt = products.map(product => 
    `Create a good background for an Instagram story advertisement for the product "${product.product_name}" by "${product.brand_name}". Include captions and hashtags.`
  ).join("\n");

  try {
    // Generate text content
    const textResponse = await openai.completions.create({
      model: "text-davinci-003",
      prompt: textPrompt,
      max_tokens: 150,
      temperature: 0.7,
    });

    // Hypothetical image generation logic
    // const imageResponse = await imageApiConfig.createImage({
    //   prompt: textPrompt,
    //   // Additional parameters as required by the image API
    // });

    // Combine text and image responses
    res.json({
      content: textResponse.choices[0].text.trim(),
      // imageUrl: imageResponse.data.imageUrl // Hypothetical image URL
    });
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
