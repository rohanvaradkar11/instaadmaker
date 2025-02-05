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
    userId,
    caption = '',
    hashtags = [],
    link = null
}) => {
    try {
        // First get the Instagram Business Account ID
        const accountResponse = await axios.get(
            `https://graph.instagram.com/v12.0/${userId}`,
            {
                params: {
                    fields: 'id,username',
                    access_token: accessToken
                }
            }
        );

        const instagramAccountId = accountResponse.data.id;
        if (!instagramAccountId) throw new Error("Instagram Business Account ID not found.");

        console.log('Instagram Account ID:', instagramAccountId);

        // Prepare story metadata
        const storyMetadata = {
            media_type: 'STORIES',
            image_url: imageUrl,
            access_token: accessToken
        };

        // Add caption and hashtags with styling
        if (caption || hashtags.length > 0) {
            const hashtagString = hashtags.map(tag => 
                tag.startsWith('#') ? tag : `#${tag}`
            ).join(' ');

            // Add text sticker for caption with styling
            const textStickers = [{
                sticker_type: 'text',
                text: `${caption} ${hashtagString}`.trim(),
                style_info: {
                    font_size: 24,
                    text_color: '#FFFFFF',  // White text
                    background_color: '#000000AA',  // Semi-transparent black background
                    alignment: 'center',
                    font_family: 'CLASSIC',
                    position: {
                        x: 0.5,  // Center horizontally
                        y: 0.8   // Near bottom
                    }
                }
            }];

            // Add hashtags as separate sticker with different styling
            if (hashtags.length > 0) {
                textStickers.push({
                    sticker_type: 'text',
                    text: hashtagString,
                    style_info: {
                        font_size: 18,
                        text_color: '#00FF00',  // Green text
                        background_color: '#00000000',  // Transparent background
                        alignment: 'left',
                        font_family: 'MODERN',
                        position: {
                            x: 0.1,  // Left side
                            y: 0.9   // Bottom
                        }
                    }
                });
            }

            storyMetadata.story_stickers = JSON.stringify(textStickers);
        }

        // Add link if provided
        if (link && link.url) {
            const stickers = JSON.parse(storyMetadata.story_stickers || '[]');
            stickers.push({
                sticker_type: 'link',
                url: link.url,
                link_text: link.linkText || 'Learn More',
                style_info: {
                    background_color: '#FF0000',  // Red background
                    text_color: '#FFFFFF',  // White text
                    position: {
                        x: 0.5,  // Center
                        y: 0.7   // Above the caption
                    }
                }
            });
            
            storyMetadata.story_sticker_ids = ['link_sticker', 'text_sticker'];
            storyMetadata.story_stickers = JSON.stringify(stickers);
        }

        // Step 1: Create media container
        console.log('Creating story with metadata:', storyMetadata);
        const createMediaResponse = await axios({
            method: 'post',
            url: `https://graph.instagram.com/v12.0/${instagramAccountId}/media`,
            data: storyMetadata,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Media container created:', createMediaResponse.data);

        // Step 2: Publish the story
        const publishResponse = await axios({
            method: 'post',
            url: `https://graph.instagram.com/v12.0/${instagramAccountId}/media_publish`,
            data: {
                creation_id: createMediaResponse.data.id,
                access_token: accessToken
            },
            headers: {
                'Content-Type': 'application/json'
            }
        });

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