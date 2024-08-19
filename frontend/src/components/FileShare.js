import React, { useState } from 'react';
import axios from 'axios';

const FileShare = ({ fileKey }) => {
  const [shareLink, setShareLink] = useState('');

  const generateShareLink = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/share/${fileKey}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setShareLink(response.data.downloadUrl);
    } catch (error) {
      console.error('Error generating share link:', error);
    }
  };

  return (
    <div>
      <button onClick={generateShareLink}>Generate Share Link</button>
      {shareLink && (
        <div>
          <p>Share Link:</p>
          <a href={shareLink} target="_blank" rel="noopener noreferrer">{shareLink}</a>
        </div>
      )}
    </div>
  );
};

export default FileShare;