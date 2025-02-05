const axios = require('axios');

/**
 * Posts a story to Instagram
 * @param {string} accessToken - Instagram access token
 * @param {string} imageUrl - Public URL of the image
 * @param {string} caption - Story caption
 * @returns {Promise<Object>} Story posting result
 */

const postStory = async (accessToken, imageUrl, caption) => {
    try {
        // Step 1: Create media container
        const createMediaResponse = await axios.post(
            'https://graph.instagram.com/v12.0/me/stories',
            {
                image_url: imageUrl,
                caption: caption,
                media_type: 'STORY',
                access_token: accessToken
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Media container created:', createMediaResponse.data);

        // Step 2: Publish the story
        const publishResponse = await axios.post(
            `https://graph.instagram.com/v12.0/me/media_publish`,
            {
                creation_id: createMediaResponse.data.id,
                access_token: accessToken
            }
        );

        console.log('Story published:', publishResponse.data);

        return {
            success: true,
            data: {
                mediaId: publishResponse.data.id,
                status: 'published'
            }
        };
    } catch (error) {
        console.error('Error posting story:', error.response?.data || error);
        throw error;
    }
};

module.exports = {
    postStory
};