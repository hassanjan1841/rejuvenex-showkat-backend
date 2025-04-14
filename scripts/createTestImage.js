const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create a test image
const createTestImage = () => {
  const width = 500;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, width, height);

  // Draw some shapes
  ctx.fillStyle = '#4a90e2';
  ctx.beginPath();
  ctx.arc(width/2, height/2, 100, 0, Math.PI * 2);
  ctx.fill();

  // Add text
  ctx.fillStyle = '#ffffff';
  ctx.font = '30px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Test Image', width/2, height/2);

  // Save the image
  const buffer = canvas.toBuffer('image/jpeg');
  const uploadsDir = path.join(__dirname, '../uploads');
  
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(uploadsDir, 'test-image.jpg'), buffer);
  console.log('Test image created successfully!');
};

createTestImage(); 