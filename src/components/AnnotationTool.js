import React, { useState, useRef,  useEffect } from 'react';
import { Stage, Layer, Rect, Text, Line, Circle, Image  } from 'react-konva';
import '../App.css';

const AnnotationTool = ({ file, imageWidth, imageHeight }) => {
  const [annotations, setAnnotations] = useState([]);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [tool, setTool] = useState('select');
  const [image, setImage] = useState(null);
  const stageRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          imageRef.current = img;
          setImage(img);
        };
        img.src = e.target.result;
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
          height: 0
        });
        break;
      case 'circle':
        setCurrentAnnotation({
          type: 'circle',
          centerX: point.x,
          centerY: point.y,
          radius: 0
        });
        break;
      case 'line':
        setCurrentAnnotation({
          type: 'line',
          points: [point.x, point.y]
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
          draggable: true
        };
        setAnnotations(prev => [...prev, textAnnotation]);
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
        setCurrentAnnotation(prev => ({
          ...prev,
          width: point.x - prev.startX,
          height: point.y - prev.startY
        }));
        break;
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(point.x - currentAnnotation.centerX, 2) +
          Math.pow(point.y - currentAnnotation.centerY, 2)
        );
        setCurrentAnnotation(prev => ({ ...prev, radius }));
        break;
      case 'line':
        setCurrentAnnotation(prev => ({
          ...prev,
          points: [...prev.points, point.x, point.y]
        }));
        break;
      default:
        break;
    }
  };

  const finishDrawing = () => {
    if (currentAnnotation) {
      setAnnotations(prev => [...prev, { ...currentAnnotation, draggable: true }]);
      setCurrentAnnotation(null);
    }
  };

  const saveAnnotatedImage = () => {
    if (!stageRef.current) return;

    // Create a temporary canvas with the original image
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    tempCanvas.width = imageWidth;
    tempCanvas.height = imageHeight;

    // Draw the original image
    if (image) {
      ctx.drawImage(image, 0, 0, imageWidth, imageHeight);
    }

    // Convert Konva stage to an image and draw it on top
    const stageCanvas = stageRef.current.toCanvas();
    ctx.drawImage(stageCanvas, 0, 0);

    // Convert to blob and download
    tempCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'annotated-image.png';
      a.click();
      URL.revokeObjectURL(url);
    });
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
          y: e.target.y()
        };
        setAnnotations(newAnnotations);
      }
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
      default:
        return null;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setTool('rect')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            backgroundColor: tool === 'rect' ? '#ffb74d' : '#ffcc80',
            color: '#663300',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease'
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
            transition: 'background-color 0.3s ease'
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
            transition: 'background-color 0.3s ease'
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
            transition: 'background-color 0.3s ease'
          }}
        >
          Text
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
            transition: 'background-color 0.3s ease'
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
            transition: 'background-color 0.3s ease'
          }}
        >
          Save Image
        </button>
      </div>
      <Stage
        width={imageWidth}
        height={imageHeight}
        onMouseDown={startDrawing}
        onMouseMove={updateDrawing}
        onMouseUp={finishDrawing}
        ref={stageRef}
      >
        <Layer>
          {image && (
            <Image
              image={image}
              width={imageWidth}
              height={imageHeight}
            />
          )}
          {annotations.map(renderAnnotation)}
          {currentAnnotation && renderAnnotation(currentAnnotation)}
        </Layer>
      </Stage>
    </div>
  );
};

export default AnnotationTool;