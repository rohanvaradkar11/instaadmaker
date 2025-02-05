import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // Assuming you're using react-router-dom
import './GenerateStory.css'; // Import the CSS file

function GenerateStory() {
    const location = useLocation();
    const { selectedProducts } = location.state || { selectedProducts: [] };

    useEffect(() => {
        console.log("requestttt data", selectedProducts);
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
        .then(response => response.json())
        .then(data => {
            console.log('Generated content:', data);
        })
        .catch(error => {
            console.error('Error generating content:', error);
        });
    }, [selectedProducts]);

    // beautify this view to show the generated content
    return (
        <div>
            <h1>Generate Story</h1>
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
            <button style={{ position: 'fixed', bottom: '10px', right: '10px' }}>
                Publish
            </button>
        </div>
    );
}

export default GenerateStory;
 