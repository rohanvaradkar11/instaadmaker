import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom'; // Import useParams
import './GenerateStory.css'; // Import the CSS file
import StoryPreview from '../components/StoryPreview';
import loaderGif from '../public/assets/loader.gif'; // Assuming you have a loader GIF

function GenerateStory() {
    const location = useLocation();
    const navigate = useNavigate(); // Initialize the navigate function
    const { company_id, application_id } = useParams(); // Get URL parameters
    const { selectedProducts } = location.state || { selectedProducts: [] };
    const [generatedContent, setGeneratedContent] = useState(null);
    const [selectedHashtags, setSelectedHashtags] = useState([]);
    const [selectedCaptions, setSelectedCaptions] = useState([]);
    const [imageConfirmed, setImageConfirmed] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false); // New loading state

    const fetchGeneratedContent = useCallback(() => {
        setLoading(true); // Set loading to true when API call starts
        const requestData = selectedProducts.map(product => ({
            brandName: product.brand?.name || 'Unknown Brand',
            categoryName: product.category_slug || 'Unknown Category'
        }));

        // Extract brand names and category names
        const brandNames = requestData.map(product => product.brandName).join(', ');
        const categoryNames = requestData.map(product => product.categoryName).join(', ');

        // Construct the prompt
        const prompt = `Create a good background for an Instagram story advertisement for the product ${brandNames}, for categories ${categoryNames}.`;

        // Log the prompt to the console
        console.log("Generated Prompt:", prompt);

        // Call the API to generate content
        fetch('/api/generate-content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-company-id': 9670
            },
            body: JSON.stringify({ products: requestData })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to generate content');
            }
            return response.json();
        })
        .then(data => {
            setGeneratedContent(data);
            setError(null);
        })
        .catch(error => {
            console.error('Error generating content:', error);
            setError(error.message);
        })
        .finally(() => {
            setLoading(false); // Set loading to false when API call completes
        });
    }, [selectedProducts]);

    useEffect(() => {
        fetchGeneratedContent();
    }, [selectedProducts, fetchGeneratedContent]);

    const handleHashtagSelection = (hashtag) => {
        setSelectedHashtags(prev => 
            prev.includes(hashtag) ? prev.filter(h => h !== hashtag) : [...prev, hashtag]
        );
    };

    const handleCaptionSelection = (caption) => {
        setSelectedCaptions(prev => 
            prev.includes(caption) ? prev.filter(c => c !== caption) : [...prev, caption]
        );
    };

    const handleImageConfirmation = () => {
        setImageConfirmed(true);
    };

    const canPreview = imageConfirmed && selectedHashtags.length > 0 && selectedCaptions.length > 0;

    // Add a back button to navigate to Home
    const handleBack = () => {
        const path = application_id 
            ? `/company/${company_id}/application/${application_id}` 
            : `/company/${company_id}/`;
        navigate(path);
    };

    // beautify this view to show the generated content
    return (
        <div>
            <h1>Generate Story</h1>
            <button onClick={handleBack} className="back-button">Back to Home</button>
            <div className="product-list">
                {selectedProducts.map((product, index) => (
                    <div key={index} className="product-card">
                        <h2>{product.name}</h2>
                        <p><strong>Brand:</strong> {product.brand?.name || 'Unknown Brand'}</p>
                        <p><strong>Category:</strong> {product.category_slug || 'Unknown Category'}</p>
                        <p><strong>Item Code:</strong> {product.item_code || 'N/A'}</p>
                    </div>
                ))}
            </div>
            {loading ? (
                <div className="loader">
                    <img src={loaderGif} alt="Loading..." />
                </div>
            ) : error ? (
                <div className="error-message">
                    <p>Error: {error}</p>
                    <button onClick={fetchGeneratedContent} className="button">Retry</button>
                </div>
            ) : generatedContent && (
                <div className="generated-content">
                    <StoryPreview
                        imageUrl={generatedContent.imageUrl}
                        hashtags={selectedHashtags}
                        captions={selectedCaptions}
                    />
                    <button onClick={handleImageConfirmation} className="button">Confirm Image</button>
                    <button onClick={fetchGeneratedContent} className="button">Regenerate Image</button>
                    <div className="hashtags">
                        <h3>Select Hashtags:</h3>
                        {generatedContent.hashtags.map((hashtag, index) => (
                            <div key={index}>
                                <input 
                                    type="checkbox" 
                                    id={`hashtag-${index}`} 
                                    checked={selectedHashtags.includes(hashtag)}
                                    onChange={() => handleHashtagSelection(hashtag)}
                                />
                                <label htmlFor={`hashtag-${index}`}>{hashtag}</label>
                            </div>
                        ))}
                    </div>
                    <div className="captions">
                        <h3>Select Captions:</h3>
                        {generatedContent.captions.map((caption, index) => (
                            <div key={index}>
                                <input 
                                    type="checkbox" 
                                    id={`caption-${index}`} 
                                    checked={selectedCaptions.includes(caption)}
                                    onChange={() => handleCaptionSelection(caption)}
                                />
                                <label htmlFor={`caption-${index}`}>{caption}</label>
                            </div>
                        ))}
                    </div>
                    <button disabled={!canPreview} className="button">Preview</button>
                </div>
            )}
            <div className="generate-story-container">
                <button className="button">Generate Story</button>
            </div>
        </div>
    );
}

export default GenerateStory;
 