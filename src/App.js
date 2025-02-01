import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import FileViewerComponent from './components/FileViewer';
import SaveOptions from './components/SaveOption';
import { pdfjs } from 'react-pdf';
import 'pdfjs-dist/build/pdf.worker.entry';
import './App.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

const App = () => {
  const [file, setFile] = useState(null);

  return (
    <div className="bg-amber-50 min-h-screen p-6 bg-black-50">
      <div className="max-w-4xl mx-auto bg-orange-100 rounded-lg shadow-md p-8 border border-black">
        <h1 className="text-3xl font-bold text-center text-amber-800 mb-6">
          FaApp
        </h1>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="col-span-1 md:col-span-2 flex items-center space-x-4 border border-black p-4">
            <FileUpload onFileSelect={setFile} />
            <SaveOptions file={file} />
          </div>
          <div className="col-span-1 md:col-span-2 border border-black p-4">
            <FileViewerComponent file={file} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;