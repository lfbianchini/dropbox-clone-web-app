import React, { useState } from 'react';
import axios from 'axios';

const FileUpload = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first!');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:3000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      console.log('File uploaded successfully:', response.data);
      setUploadProgress(0);
      setFile(null);
      
      // Notify parent component that upload is complete
      if (onUploadComplete) {
        onUploadComplete();
      }
      
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div>
      <h2>Upload File</h2>
      <input 
        type="file" 
        onChange={handleFileChange} 
        disabled={isUploading} 
      />
      <button 
        onClick={handleUpload} 
        disabled={!file || isUploading}
      >
        {isUploading ? 'Uploading...' : 'Upload'}
      </button>
      {uploadProgress > 0 && (
        <div>
          <progress value={uploadProgress} max="100" />
          <span>{uploadProgress}%</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;