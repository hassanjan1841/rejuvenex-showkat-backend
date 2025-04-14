# Rejuvenex Backend

Backend server for the Rejuvenex peptide store.

## Features

- User authentication and authorization
- Product management
- Category management
- Order processing
- Affiliate system
- Email notifications
- Image upload with Cloudinary
- Payment processing with Stripe

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Cloudinary account
- Stripe account
- Gmail account (for email notifications)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env-example`
4. Set up your environment variables

## Environment Variables

```
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
FRONTEND_URL=http://localhost:5173
PORT=3000
```

## Category Management

The API provides endpoints for managing product categories:

### Endpoints

- `GET /api/categories` - Get all active categories
- `GET /api/categories/:id` - Get a specific category
- `POST /api/categories` - Create a new category (admin only)
- `PUT /api/categories/:id` - Update a category (admin only)
- `DELETE /api/categories/:id` - Delete a category (admin only)

### Category Schema

```javascript
{
  name: String,          // Required, unique
  description: String,   // Optional
  image: String,         // URL to category image
  isActive: Boolean,     // Default: true
  createdAt: Date,       // Automatically set
  updatedAt: Date        // Automatically set
}
```

### Testing Categories

1. Create a test image:
   ```bash
   npm run create:test-image
   ```

2. Run category tests:
   ```bash
   npm run test:categories
   ```

## Development

Start the development server:
```bash
npm run dev
```

## Production

Start the production server:
```bash
npm start
```

## API Documentation

For detailed API documentation, please refer to the API docs in the `/docs` directory.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 