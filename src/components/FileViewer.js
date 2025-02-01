import React, { useState, useRef, useEffect } from 'react';
import FileViewer from 'react-file-viewer';
import * as XLSX from 'xlsx';
import { Document, Page, pdfjs } from 'react-pdf';
import { Stage, Layer, Rect, Text, Line, Circle, Image as KonvaImage } from 'react-konva';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import '../App.css';

// Setting up the worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PDFViewer = ({ filePath }) => {
  const [numPages, setNumPages] = useState(null);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  return (
    <Document file={filePath} onLoadSuccess={onDocumentLoadSuccess}>
      {Array.from(new Array(numPages), (el, index) => (
        <Page key={`page_${index + 1}`} pageNumber={index + 1} width={600} />
      ))}
    </Document>
  );
};

const ExcelViewer = ({ file }) => {
  const [sheetData, setSheetData] = useState([]);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const workbook = XLSX.read(e.target.result, { type: 'binary' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      setSheetData(data);
    };
    reader.readAsBinaryString(file);
  }, [file]);

  return (
    <table>
      <tbody>
        {sheetData.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const AnnotationTool = ({ annotations, setAnnotations, width, height, file }) => {
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [tool, setTool] = useState('select');
  const stageRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.src = e.target.result;
        img.onload = () => {
          fileRef.current = img;
        };
      };
      reader.readAsDataURL(file);
    }
  }, [file]);

  const startDrawing = (e) => {
    if (tool === 'select') return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    switch (tool) {
      case 'rect':
        setCurrentAnnotation({
          type: 'rect',
          startX: point.x,
          startY: point.y,
          width: 0,
          height: 0,
        });
        break;
      case 'circle':
        setCurrentAnnotation({
          type: 'circle',
          centerX: point.x,
          centerY: point.y,
          radius: 0,
        });
        break;
      case 'line':
        setCurrentAnnotation({
          type: 'line',
          points: [point.x, point.y],
        });
        break;
      case 'text':
        const text = prompt('Enter text:') || 'New Text';
        const textAnnotation = {
          type: 'text',
          x: point.x,
          y: point.y,
          text,
          fontSize: 16,
          draggable: true,
        };
        setAnnotations((prev) => [...prev, textAnnotation]);
        break;
      case 'opaqueHighlight':
        setCurrentAnnotation({
          type: 'opaqueHighlight',
          startX: point.x,
          startY: point.y,
          width: 0,
          height: 0,
        });
        break;
      case 'transparentHighlight':
        setCurrentAnnotation({
          type: 'transparentHighlight',
          startX: point.x,
          startY: point.y,
          width: 0,
          height: 0,
        });
        break;
      default:
        break;
    }
  };

  const updateDrawing = (e) => {
    if (!currentAnnotation) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    switch (currentAnnotation.type) {
      case 'rect':
      case 'opaqueHighlight':
      case 'transparentHighlight':
        setCurrentAnnotation((prev) => ({
          ...prev,
          width: point.x - prev.startX,
          height: point.y - prev.startY,
        }));
        break;
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(point.x - currentAnnotation.centerX, 2) +
            Math.pow(point.y - currentAnnotation.centerY, 2)
        );
        setCurrentAnnotation((prev) => ({ ...prev, radius }));
        break;
      case 'line':
        setCurrentAnnotation((prev) => ({
          ...prev,
          points: [...prev.points, point.x, point.y],
        }));
        break;
      default:
        break;
    }
  };

  const finishDrawing = () => {
    if (currentAnnotation) {
      setAnnotations((prev) => [...prev, { ...currentAnnotation, draggable: true }]);
      setCurrentAnnotation(null);
    }
  };

  const saveAnnotatedImage = async () => {
    if (!stageRef.current) return;

    const stage = stageRef.current.getStage();
    const dataUrl = stage.toDataURL({ pixelRatio: 2 });

    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    tempCanvas.width = width;
    tempCanvas.height = height;

    if (fileRef.current) {
      ctx.drawImage(fileRef.current, 0, 0, width, height);
    }

    const image = new window.Image();
    image.src = dataUrl;
    image.onload = () => {
      ctx.drawImage(image, 0, 0);

      tempCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'annotated-image.png';
        a.click();
        URL.revokeObjectURL(url);
      });
    };
  };

  const renderAnnotation = (annotation, index) => {
    const commonProps = {
      key: index,
      draggable: annotation.draggable,
      onDragEnd: (e) => {
        const newAnnotations = [...annotations];
        newAnnotations[index] = {
          ...annotation,
          x: e.target.x(),
          y: e.target.y(),
        };
        setAnnotations(newAnnotations);
      },
    };

    switch (annotation.type) {
      case 'rect':
        return (
          <Rect
            {...commonProps}
            x={annotation.startX}
            y={annotation.startY}
            width={annotation.width}
            height={annotation.height}
            fill="rgba(0,255,0,0.3)"
            stroke="green"
          />
        );
      case 'circle':
        return (
          <Circle
            {...commonProps}
            x={annotation.centerX}
            y={annotation.centerY}
            radius={annotation.radius}
            fill="rgba(255,0,0,0.3)"
            stroke="red"
          />
        );
      case 'line':
        return (
          <Line
            {...commonProps}
            points={annotation.points}
            stroke="blue"
            strokeWidth={2}
          />
        );
      case 'text':
        return (
          <Text
            {...commonProps}
            x={annotation.x}
            y={annotation.y}
            text={annotation.text}
            fontSize={annotation.fontSize}
            fill="black"
          />
        );
      case 'opaqueHighlight':
        return (
          <Rect
            {...commonProps}
            x={annotation.startX}
            y={annotation.startY}
            width={annotation.width}
            height={annotation.height}
            fill="rgba(0, 0, 0, 1)"
          />
        );
      case 'transparentHighlight':
        return (
          <Rect
            {...commonProps}
            x={annotation.startX}
            y={annotation.startY}
            width={annotation.width}
            height={annotation.height}
            fill="rgba(255, 255, 0, 0.3)"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '20px', marginTop: '-32px' }}>
        <button
          onClick={() => setTool('rect')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            backgroundColor: tool === 'rect' ? '#ffb74d' : '#ffcc80',
            color: '#663300',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease',
          }}
        >
          Rectangle
        </button>
        <button
          onClick={() => setTool('circle')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            backgroundColor: tool === 'circle' ? '#ffb74d' : '#ffcc80',
            color: '#663300',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease',
          }}
        >
          Circle
        </button>
        <button
          onClick={() => setTool('line')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            backgroundColor: tool === 'line' ? '#ffb74d' : '#ffcc80',
            color: '#663300',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease',
          }}
        >
          Line
        </button>
        <button
          onClick={() => setTool('text')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            backgroundColor: tool === 'text' ? '#ffb74d' : '#ffcc80',
            color: '#663300',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease',
          }}
        >
          Text
        </button>
        <button
          onClick={() => setTool('opaqueHighlight')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            backgroundColor: tool === 'opaqueHighlight' ? '#ffb74d' : '#ffcc80',
            color: '#663300',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease',
          }}
        >
          Opaque Highlight
        </button>
        <button
          onClick={() => setTool('transparentHighlight')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            backgroundColor: tool === 'transparentHighlight' ? '#ffb74d' : '#ffcc80',
            color: '#663300',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease',
          }}
        >
          Transparent Highlight
        </button>
        <button
          onClick={() => setTool('select')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            backgroundColor: tool === 'select' ? '#ffb74d' : '#ffcc80',
            color: '#663300',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease',
          }}
        >
          Select
        </button>
        <button
          onClick={saveAnnotatedImage}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            backgroundColor: '#4CAF50',
            color: 'white',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease',
          }}
        >
          Save Image
        </button>
      </div>
      <Stage
        width={width}
        height={height}
        onMouseDown={startDrawing}
        onMouseMove={updateDrawing}
        onMouseUp={finishDrawing}
        ref={stageRef}
      >
        <Layer>
          {annotations.map(renderAnnotation)}
          {currentAnnotation && renderAnnotation(currentAnnotation)}
        </Layer>
      </Stage>
    </div>
  );
};

const FileViewerComponent = ({ file }) => {
  const [annotations, setAnnotations] = useState([]);
  const fileType = file ? file.name.split('.').pop().toLowerCase() : '';
  const filePath = file ? URL.createObjectURL(file) : '';

  useEffect(() => {
    return () => {
      if (filePath) {
        URL.revokeObjectURL(filePath);
      }
    };
  }, [filePath]);

  const renderCustomViewer = () => {
    const viewerHeight = 600;
    const viewerWidth = 800;

    switch (fileType) {
      case 'xlsx':
      case 'xls':
        return (
          <div style={{ position: 'relative' }}>
            <ExcelViewer file={file} />
            <div style={{ position: 'absolute', top: 0, left: 0 }}>
              <AnnotationTool
                annotations={annotations}
                setAnnotations={setAnnotations}
                width={viewerWidth}
                height={viewerHeight}
                file={file}
              />
            </div>
          </div>
        );
      case 'pdf':
        return (
          <div style={{ position: 'relative' }}>
            <PDFViewer filePath={filePath} />
            <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
              <AnnotationTool
                annotations={annotations}
                setAnnotations={setAnnotations}
                width={viewerWidth}
                height={viewerHeight}
                file={file}
              />
            </div>
          </div>
        );
      case 'msg':
        return <div>MSG file preview not supported</div>;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return (
          <div style={{ position: 'relative' }}>
            <img src={filePath} alt="file" width={viewerWidth} height={viewerHeight} />
            <div style={{ position: 'absolute', top: 0, left: 0 }}>
              <AnnotationTool
                annotations={annotations}
                setAnnotations={setAnnotations}
                width={viewerWidth}
                height={viewerHeight}
                file={file}
              />
            </div>
          </div>
        );
      default:
        return (
          <div style={{ position: 'relative' }}>
            <FileViewer fileType={fileType} filePath={filePath} />
            <div style={{ position: 'absolute', top: 0, left: 0 }}>
              <AnnotationTool
                annotations={annotations}
                setAnnotations={setAnnotations}
                width={viewerWidth}
                height={viewerHeight}
                file={file}
              />
            </div>
          </div>
        );
    }
  };

  if (!file) {
    return <div>Please upload a file to view</div>;
  }

  return <div>{renderCustomViewer()}</div>;
};

export default FileViewerComponent;