import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import "./style/home.css";
import greenDot from "../public/assets/green-dot.svg";
import grayDot from "../public/assets/grey-dot.svg";
import DEFAULT_NO_IMAGE from "../public/assets/default_icon_listing.png";
import loaderGif from "../public/assets/loader.gif";
import axios from "axios";
import urlJoin from "url-join";

const EXAMPLE_MAIN_URL = window.location.origin;

export const Home = () => {
  const [pageLoading, setPageLoading] = useState(false);
  const [productList, setProductList] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productHashtags, setProductHashtags] = useState([]);
  const DOC_URL_PATH = "/help/docs/sdk/latest/platform/company/catalog/#getProducts";
  const DOC_APP_URL_PATH = "/help/docs/sdk/latest/platform/application/catalog#getAppProducts";
  const { application_id, company_id } = useParams();
  console.log("Application ID:", application_id); // Debug log
  console.log("Company ID:", company_id); // Debug log
  const documentationUrl ='https://api.fynd.com'
  const navigate = useNavigate();
  
  const isApplicationLaunch = useCallback(() => !!application_id, [application_id]);

  const fetchProducts = useCallback(async () => {
    setPageLoading(true);
    try {
      const { data } = await axios.get(urlJoin(EXAMPLE_MAIN_URL, '/api/products'), {
        headers: {
          "x-company-id": company_id,
        }
      });
      console.log("Fetched Products:", data.items); // Debug log
      setProductList(data.items);
    } catch (e) {
      console.error("Error fetching products:", e);
    } finally {
      setPageLoading(false);
    }
  }, [company_id]);

  const fetchHashtags = async (productId) => {
    setPageLoading(true);
    try {
      const { data } = await axios.get(urlJoin(EXAMPLE_MAIN_URL, '/api/hashtags'),{
        headers: {
          "x-company-id": company_id,
        }
      });
      setProductHashtags(prevState => ({
        ...prevState,
        [productId]: data.items
      }));
    } catch (e) {
      console.error("Error fetching hashtags:", e);
    } finally {
      setPageLoading(false);
    }
  };

  const fetchApplicationProducts = useCallback(async () => {
    setPageLoading(true);
    try {
      const { data } = await axios.get(urlJoin(EXAMPLE_MAIN_URL, `/api/products/application/${application_id}`), {
        headers: {
          "x-company-id": company_id,
        }
      });
      console.log("Fetched Application Products:", data.items); // Debug log
      setProductList(data.items);
    } catch (e) {
      console.error("Error fetching application products:", e);
    } finally {
      setPageLoading(false);
    }
  }, [application_id, company_id]);

  useEffect(() => {
    isApplicationLaunch() ? fetchApplicationProducts() : fetchProducts();

    // Retrieve selected products from session storage
    const storedSelectedProducts = sessionStorage.getItem('selectedProducts');
    if (storedSelectedProducts) {
      const parsedProducts = JSON.parse(storedSelectedProducts);
      console.log("Retrieved Selected Products from Session Storage:", parsedProducts); // Debug log
      setSelectedProducts(parsedProducts.map(product => product.id));
    }
  }, [application_id, fetchApplicationProducts, fetchProducts, isApplicationLaunch]);

  useEffect(() => {
    console.log("Product List:", productList); // Debug log
    console.log("Selected Products:", selectedProducts); // Debug log
  }, [productList, selectedProducts]);

  const handlePublish = async () => {
    setPageLoading(true);
    try {
      const hostUrl = import.meta.env.VITE_HOST_URL
      const publishUrl = `${hostUrl}/publish`;

      console.log("publishUrl ======> ", publishUrl);
      console.log("env variable ======> ", import.meta.env.VITE_HOST_URL); // Debug log

      window.open(publishUrl, '_blank');
      // const response = await axios.get(publishUrl);
      // console.log("response ======> ", response);
      
      // if (response.data.success) {
      //     // Store the Instagram credentials
      //     const { accessToken, userId, username } = response.data.data;
          
      //     // Example: Post to Instagram
      //     const postResponse = await axios.post(`${import.meta.env.VITE_HOST_URL}/api/instagram/post`, {
      //         accessToken,
      //         mediaUrl: 'YOUR_MEDIA_URL',
      //         caption: 'Your caption here'
      //     });

      //     if (postResponse.data.success) {
      //         console.log('Successfully posted to Instagram!');
      //     }
      // }
    } catch (error) {
      console.error("Error publishing:", error);
    } finally {
      setPageLoading(false);
    }
  };

  const productProfileImage = (media) => {
    if (!media || !media.length) {
      return DEFAULT_NO_IMAGE;
    }
    const profileImg = media.find(m => m.type === "image");
    return profileImg?.url || DEFAULT_NO_IMAGE;
  };

  const getDocumentPageLink = () => {
    return documentationUrl
      .replace("api", "partners")
      .concat(isApplicationLaunch() ? DOC_APP_URL_PATH : DOC_URL_PATH);
  };

  const handleCheckboxChange = (productId) => {
    setSelectedProducts(prevSelected => {
      if (prevSelected.includes(productId)) {
        return prevSelected.filter(id => id !== productId);
      } else if (prevSelected.length < 5) {
        return [...prevSelected, productId];
      }
      return prevSelected;
    });
  };

  const generateStory = () => {
    // Filter the full product objects based on selected IDs
    const selectedProductData = productList.filter(product => selectedProducts.includes(product.id));

    console.log("Generating story for products::::::", selectedProductData);

    // Save selected products to session storage
    sessionStorage.setItem('selectedProducts', JSON.stringify(selectedProductData));

    // Construct the path with company_id and application_id if available
    const path = application_id 
        ? `/company/${company_id}/application/${application_id}/generate-story` 
        : `/company/${company_id}/generate-story`;

    navigate(path, { state: { selectedProducts: selectedProductData } });
  };

  return (
    <>
      {pageLoading ? (
        <div className="loader" data-testid="loader">
          <img src={loaderGif} alt="loader GIF" />
        </div>
      ) : (
        <div className="products-container">
          <div className="title">
            This is an example extension home page user interface.
          </div>

          <div className="section">
            <div className="heading">
              <span>Example {isApplicationLaunch() ? 'Application API' : 'Platform API'}</span> :
              <a href={getDocumentPageLink()} target="_blank" rel="noopener noreferrer">
                {isApplicationLaunch() ? 'getAppProducts' : 'getProducts'}
              </a>
            </div>
            <div className="description">
              This is an illustrative Platform API call to fetch the list of products
              in this company. Check your extension folder's 'server.js'
              file to know how to call Platform API and start calling API you
              require.
            </div>
          </div>

          <div className="generate-story-container">
            <button
              onClick={generateStory}
              disabled={selectedProducts.length === 0}
              className="generate-story-button"
            >
              Generate Story
            </button>
          </div>

          <div>
            <div className="header-container">
              {/* Remove the Publish button */}
              {/* <button className="publish-button" onClick={handlePublish}>
                Publish
              </button> */}
            </div>
          </div>
          <div>
            {productList.map((product, index) => (
              <div className="product-list-container flex-row" key={`product-${product.name}-${index}`}>
                <img className="mr-r-12" src={product.is_active ? greenDot : grayDot} alt="status" />
                <div className="card-avatar mr-r-12">
                  <img src={productProfileImage(product.media)} alt={product.name} />
                </div>
                <div className="flex-column">
                  <div className="flex-row">
                    <div className="product-name" data-testid={`product-name-${product.id}`}>
                      {product.name}
                    </div>
                    <div className="product-item-code">|</div>
                    {product.item_code && (
                      <span className="product-item-code">
                        Item Code:
                        <span className="cl-RoyalBlue" data-testid={`product-item-code-${product.id}`}>
                          {product.item_code}
                        </span>
                      </span>
                    )}
                  </div>
                  {product.brand && (
                    <div className="product-brand-name" data-testid={`product-brand-name-${product.id}`}>
                      {product.brand.name}
                    </div>
                  )}
                  {product.category_slug && (
                    <div className="product-category" data-testid={`product-category-slug-${product.id}`}>
                      Category: <span>{product.category_slug}</span>
                    </div>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.id)}
                  onChange={() => handleCheckboxChange(product.id)}
                  disabled={selectedProducts.length >= 5 && !selectedProducts.includes(product.id)}
                  style={{ transform: 'scale(1.5)', marginLeft: 'auto' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default Home;
