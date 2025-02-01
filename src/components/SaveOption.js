import React from 'react';
import { saveAs } from 'file-saver';

const SaveOptions = ({ file, annotations }) => {
  const handleSave = () => {
    // Convert file to Blob if it's not already one
    let blob;
    if (file instanceof Blob || file instanceof File) {
      blob = file;
    } else {
      blob = new Blob([file], { type: 'application/octet-stream' });
    }

    // Save the file using file-saver
    saveAs(blob, 'annotated-file');
  };

  return (
    <div>
      <button onClick={handleSave}>Save Locally</button>
    </div>
  );
};

export default SaveOptions;