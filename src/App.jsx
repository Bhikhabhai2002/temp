import React, { useEffect, useRef, useState } from "react";
import "@mediapipe/face_mesh";
import "./App.css";

const FaceMeshApp = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [useCamera, setUseCamera] = useState(false); // Toggle between camera & upload mode
  const [faceMesh, setFaceMesh] = useState(null); // Store FaceMesh instance

  useEffect(() => {
    import("@mediapipe/face_mesh").then((mpFaceMesh) => {
      const newFaceMesh = new mpFaceMesh.FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${mpFaceMesh.VERSION}/${file}`,
      });

      newFaceMesh.setOptions({
        selfieMode: true,
        enableFaceGeometry: false,
        maxNumFaces: 1,
        refineLandmarks: true, // More accurate landmarks
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      setFaceMesh(newFaceMesh);

      newFaceMesh.onResults((results) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        if (results.multiFaceLandmarks) {
          results.multiFaceLandmarks.forEach((landmarks) => {
            drawLandmarks(ctx, landmarks);
          });
        }
      });

      if (useCamera) {
        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then((stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play();
            }

            const processVideo = async () => {
              if (videoRef.current) {
                await newFaceMesh.send({ image: videoRef.current });
              }
              requestAnimationFrame(processVideo);
            };

            processVideo();
          })
          .catch((error) => {
            console.error("Error accessing webcam:", error);
            alert("Could not access webcam. Please check camera permissions.");
          });
      }
    });

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        let tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [useCamera]); // Re-run when useCamera state changes

  // Handle image upload and send to FaceMesh
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    //Reset before loading new image
    resetWebsiteData();
  
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = async () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
  
        // Dynamically set canvas size to match image dimensions
        canvas.width = img.width;
        canvas.height = img.height;
  
        // Draw uploaded image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
        //Ensure FaceMesh exists before processing
        if (!faceMesh) {
          console.error("FaceMesh not initialized yet!");
          return;
        }
  
        try {
          await faceMesh.send({ image: img }); // Process new image
        } catch (error) {
          console.error("Error processing image with FaceMesh:", error);
        }
      };
    };
  
    reader.readAsDataURL(file);
  };
  
  const resetWebsiteData = () => {
    // 1️ Clear the Canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 640; // Reset to default width
      canvas.height = 480; // Reset to default height
    }
  
    // 2️ Stop the Camera Stream (if active)
    if (videoRef.current && videoRef.current.srcObject) {
      let tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  

  return (
    <div>
      <button
        onClick={() => {
          setUseCamera(!useCamera);

          // Clear the canvas when switching modes
          const ctx = canvasRef.current.getContext("2d");
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }}
        className="toggle-btn"
      >
        {useCamera ? "Switch to Upload Image" : "Switch to Camera"}
      </button>

      <div className="container">
        {useCamera ? (
          <video className="input_video" ref={videoRef} autoPlay muted></video>
        ) : (
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="upload-input"
          />

        )}

        <div className="canvas-container">
          <canvas className="output_canvas" ref={canvasRef}></canvas>
        </div>
      </div>
    </div>
  );
};

const drawLandmarks = (ctx, landmarks) => {
  if (!ctx || !landmarks) return;

  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;

  const drawConnectors = (indices, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();

    indices.forEach((index, i) => {
      const x = landmarks[index].x * canvasWidth;
      const y = landmarks[index].y * canvasHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  };

  // Define facial feature connections
  const FACEMESH_RIGHT_EYE = [33, 160, 158, 133, 153, 144, 33];
  const FACEMESH_LEFT_EYE = [263, 373, 380, 362, 385, 387, 263];
  const FACEMESH_LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 61];

  drawConnectors(FACEMESH_RIGHT_EYE, "blue");
  drawConnectors(FACEMESH_LEFT_EYE, "blue");
  drawConnectors(FACEMESH_LIPS, "red");

  // Draw individual landmark points
  landmarks.forEach((landmark) => {
    const x = landmark.x * canvasWidth;
    const y = landmark.y * canvasHeight;

    ctx.beginPath();
    ctx.arc(x, y, 1, 0, 2 * Math.PI);
    ctx.fillStyle = "yellow";
    ctx.fill();
  });
};


export default FaceMeshApp;
