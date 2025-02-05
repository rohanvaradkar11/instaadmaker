import React from 'react';
import './StoryPreview.css'; // Import your CSS for styling

const StoryPreview = ({ imageUrl, hashtags, captions }) => {
  return (
    <div className="story-preview">
      <img src={imageUrl} alt="Story Background" className="story-image" />
      <div className="story-content">
        <div className="story-captions">
          {captions.map((caption, index) => (
            <p key={index}>{caption}</p>
          ))}
        </div>
        <div className="story-hashtags">
          {hashtags.map((hashtag, index) => (
            <span key={index} className="hashtag">#{hashtag}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoryPreview; 