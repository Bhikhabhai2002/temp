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
            for (let i = 0; i < landmarks.length; i++) {
              const x = landmarks[i].x * canvas.width;
              const y = landmarks[i].y * canvas.height;

              ctx.beginPath();
              ctx.arc(x, y, 1, 0, 2 * Math.PI);
              ctx.fillStyle = "yellow";
              ctx.fill();
            }
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

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = async () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Clear previous drawing
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Resize canvas to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the uploaded image
        ctx.drawImage(img, 0, 0, img.width, img.height);

        // Process the image with FaceMesh
        if (faceMesh) {
          await faceMesh.send({ image: img });
        }
      };
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      {/* Toggle Button */}
      <button onClick={() => setUseCamera(!useCamera)} className="toggle-btn">
        {useCamera ? "Switch to Upload Image" : "Switch to Camera"}
      </button>

      <div className="container">
        {useCamera ? (
          <video className="input_video" ref={videoRef} autoPlay muted></video>
        ) : (
          <input type="file" accept="image/*" onChange={handleImageUpload} className="upload-input" />
        )}

        <div className="canvas-container">
          <canvas className="output_canvas" ref={canvasRef}></canvas>
        </div>
      </div>
    </div>
  );
};

const drawLandmarks = (ctx, landmarks) => {
  const drawConnectors = (indices, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();

    indices.forEach((index, i) => {
      const x = landmarks[index].x * ctx.canvas.width;
      const y = landmarks[index].y * ctx.canvas.height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  };

  // Define face mesh connections
  const FACEMESH_RIGHT_EYE = [33, 160, 158, 133, 153, 144, 33]; // Right eye (loop)
  const FACEMESH_LEFT_EYE = [263, 373, 380, 362, 385, 387, 263]; // Left eye (loop)
  const FACEMESH_LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 61]; // Lips outline

  // Draw each feature separately
  drawConnectors(FACEMESH_RIGHT_EYE, "blue"); // Right eye
  drawConnectors(FACEMESH_LEFT_EYE, "blue"); // Left eye
  drawConnectors(FACEMESH_LIPS, "red"); // Lips
};


export default FaceMeshApp;
