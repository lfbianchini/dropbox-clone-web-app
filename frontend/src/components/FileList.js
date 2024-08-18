import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FileShare from './FileShare';

const FileList = ({ onUploadComplete }) => {
  const [files, setFiles] = useState([]);
  const [selectedFileKey, setSelectedFileKey] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    if (onUploadComplete) {
      fetchFiles();
    }
  }, [onUploadComplete]);

  const fetchFiles = async () => {
    try {
      const response = await axios.get('http://localhost:3000/files');
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleShare = (fileKey) => {
    setSelectedFileKey(fileKey);
  };

  return (
    <div>
      <h2>Your Files</h2>
      <ul>
        {files.map((file) => (
          <li key={file.key}>
            {file.key} - <button onClick={() => handleShare(file.key)}>Share</button>
            {selectedFileKey === file.key && <FileShare fileKey={file.key} />}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FileList;