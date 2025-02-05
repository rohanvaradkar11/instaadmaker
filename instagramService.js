const axios = require('axios');

/**
 * Posts a story to Instagram with enhanced features
 * @param {Object} storyData - Story data object
 * @param {string} storyData.accessToken - Instagram access token
 * @param {string} storyData.imageUrl - Public URL of the image
 * @param {string} storyData.caption - Story caption
 * @param {string[]} storyData.hashtags - Array of hashtags
 * @param {Object} storyData.link - Link object
 * @param {string} storyData.link.url - URL to link to
 * @param {string} storyData.link.linkText - Text for the link sticker
 * @returns {Promise<Object>} Story posting result
 */

const postStory = async ({
    accessToken,
    imageUrl,
    caption = '',
    hashtags = [],
    link = null
}) => {
    try {
        // First get the Instagram Business Account ID
        const accountResponse = await axios.get(
            'https://graph.instagram.com/me',
            {
                params: {
                    fields: 'id,username',
                    access_token: accessToken
                }
            }
        );

        const instagramAccountId = accountResponse.data.id;
        console.log('Instagram Account ID:', instagramAccountId);

        // Prepare story metadata
        const storyMetadata = {
            media_type: 'STORIES',
            image_url: imageUrl,
            access_token: accessToken
        };

        // Add caption and hashtags if provided
        if (caption || hashtags.length > 0) {
            const hashtagString = hashtags.map(tag => 
                tag.startsWith('#') ? tag : `#${tag}`
            ).join(' ');
            
            storyMetadata.caption = `${caption} ${hashtagString}`.trim();
        }

        // Add link if provided
        if (link && link.url) {
            storyMetadata.story_sticker_ids = ['link_sticker'];
            storyMetadata.story_stickers = JSON.stringify([{
                sticker_type: 'link',
                url: link.url,
                link_text: link.linkText || 'Learn More'
            }]);
        }

        // Step 1: Create media container
        console.log('Creating story with metadata:', storyMetadata);
        const createMediaResponse = await axios.post(
            `https://graph.instagram.com/${instagramAccountId}/media`,
            storyMetadata
        );

        console.log('Media container created:', createMediaResponse.data);

        // Step 2: Publish the story
        const publishResponse = await axios.post(
            `https://graph.instagram.com/${instagramAccountId}/stories`,
            {
                creation_id: createMediaResponse.data.id,
                access_token: accessToken
            }
        );
        // const publishResponse = await axios.post(
        //     `https://graph.instagram.com/${instagramAccountId}/media_publish`,
        //     {
        //         creation_id: createMediaResponse.data.id,
        //         access_token: accessToken
        //     }
        // );

        console.log('Story published:', publishResponse.data);

        return {
            success: true,
            data: {
                mediaId: publishResponse.data.id,
                status: 'published',
                instagramAccountId,
                storyDetails: {
                    caption: storyMetadata.caption,
                    hashtags: hashtags,
                    link: link?.url
                }
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