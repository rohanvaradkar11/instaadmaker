const axios = require("axios");
// const cloudinary = require("cloudinary").v2;

// cloudinary.config({ 
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
//   api_key: process.env.CLOUDINARY_API_KEY, 
//   api_secret: process.env.CLOUDINARY_API_SECRET 
// });

async function generateAndUploadImage(prompt) {
    try {
        console.log("reach generateAndUploadImage function", prompt)
        // Step 1: Generate Image using OpenAI's DALL·E
        const imageResponse = await axios.post(
            "https://api.openai.com/v1/images/generations",
            {
                model: "dall-e-2",
                prompt: prompt,
                n: 1,
                size: "1024x1024"
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );
        console.log("imageResponse", imageResponse)
        const imageUrl = imageResponse.data?.data?.[0]?.url;
        console.log("image URL", imageUrl)

        if (!imageUrl) return null;
        // Step 2: Upload to Cloudinary (or any cloud storage)
        // const uploadResponse = await cloudinary.uploader.upload(imageUrl, {
        //     folder: "generated_images"
        // });

        // return uploadResponse.secure_url; // Return the hosted image URL
        return imageUrl
    } catch (error) {
        console.error("Error generating or uploading image:", error);
        return null;
    }
}

module.exports = { generateAndUploadImage }

// Modify your main function to include image generation
// async function generateContent(req, res) {
//     try {
//         // Your existing text generation logic
//         const generatedText = textResponse.data?.choices?.[0]?.message?.content?.trim();
//         let parsedContent = JSON.parse(generatedText);

//         // Generate image based on product description
//         const imagePrompt = `A visually appealing Instagram story background for a product in the ${products[0].categoryName} category, with trendy aesthetics.`;
//         const imageLink = await generateAndUploadImage(imagePrompt);

//         res.json({
//             success: true,
//             captions: parsedContent.captions,
//             hashtags: parsedContent.hashtags,
//             image_link: imageLink // Send image URL to frontend
//         });
//     } catch (error) {
//         console.error("Error generating content:", error);
//         res.status(500).json({ error: "Failed to generate content" });
//     }
// }
