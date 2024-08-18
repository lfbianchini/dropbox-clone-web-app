import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';

const App = () => {
  const [uploadComplete, setUploadComplete] = useState(0);

  const handleUploadComplete = () => {
    setUploadComplete(prev => prev + 1);
  };

  return (
    <div>
      <FileUpload onUploadComplete={handleUploadComplete} />
      <FileList onUploadComplete={uploadComplete} />
    </div>
  );
};

export default App;
