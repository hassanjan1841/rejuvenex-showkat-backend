const nodemailer = require("nodemailer")
const dns = require('dns').promises;

// Create a more robust email transporter with better error handling
const createEmailTransporter = async () => {
  console.log('Creating email transporter...');
  
  // Check if we have the required environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("Email configuration missing. Please check your .env file.");
    return null;
  }

  // Verify DNS resolution first
  try {
    console.log('Verifying DNS resolution for smtp.gmail.com...');
    const dnsResult = await dns.lookup('smtp.gmail.com');
    console.log('DNS resolution successful:', dnsResult);
  } catch (error) {
    console.error('DNS resolution failed:', error);
    throw new Error('Cannot resolve smtp.gmail.com. Please check your internet connection and DNS settings.');
  }

  // Create the transporter with explicit host and port
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    },
    debug: process.env.NODE_ENV !== "production", // Only enable debug in development
  });

  // Verify the transporter configuration
  try {
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log("SMTP server is ready to take our messages");
    return transporter;
  } catch (error) {
    console.error("SMTP connection error:", error);
    console.error("Please check your email credentials in the .env file.");
    console.error("For Gmail, make sure you're using an App Password, not your regular password.");
    console.error("See README.md for instructions on setting up Gmail App Password.");
    return null;
  }
};

// Create the transporter
let transporter = null;

// Initialize the transporter
const initTransporter = async () => {
  if (!transporter) {
    transporter = await createEmailTransporter();
  }
  return transporter;
};

// Helper function to send emails with better error handling
const sendEmail = async (mailOptions) => {
  try {
    // Ensure transporter is initialized
    const emailTransporter = await initTransporter();
    
    if (!emailTransporter) {
      console.error("Email transporter not configured. Skipping email send.");
      return false;
    }

    console.log(`Sending email to: ${mailOptions.to}`);
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    
    // Provide more helpful error messages
    if (error.code === 'EAUTH') {
      console.error("Authentication failed. Please check your email credentials.");
      console.error("For Gmail, make sure you're using an App Password, not your regular password.");
      console.error("See README.md for instructions on setting up Gmail App Password.");
    } else if (error.code === 'ECONNECTION') {
      console.error("Connection failed. Please check your internet connection and try again.");
    } else if (error.code === 'ESOCKET') {
      console.error("Socket error. The email server might be down or unreachable.");
    } else if (error.code === 'EDNS') {
      console.error("DNS resolution error. Please check your internet connection and DNS settings.");
    }
    
    return false;
  }
};

// Define all email functions
const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify Your Email - Rejuvenexx",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: linear-gradient(to right, #000, #0066cc); padding: 20px; color: white; text-align: center;">
          <h1>Rejuvenexx</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2>Verify Your Email Address</h2>
          <p>Thank you for signing up with Rejuvenexx. Please click the button below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
          </div>
          <p>If you did not create an account, please ignore this email.</p>
          <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
          <p style="word-break: break-all;">${verificationUrl}</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Rejuvenexx. All rights reserved.</p>
        </div>
      </div>
    `,
  }

  return await sendEmail(mailOptions);
}

const sendOrderStatusEmail = async (email, order) => {
  try {
    // Ensure order has all required properties with default values
    const orderData = {
      orderNumber: order.orderNumber || 'N/A',
      status: order.status || 'Unknown',
      items: order.items || [],
      subtotal: order.subtotal || 0,
      shipping: order.shipping || 0,
      tax: order.tax || 0,
      total: order.total || 0,
      trackingNumber: order.trackingNumber || 'Not available',
      shippingAddress: order.shippingAddress || {}
    };

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Order Status Update - Order #${orderData.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a5568;">Order Status Update</h2>
          <p>Your order #${orderData.orderNumber} has been updated to: <strong>${orderData.status}</strong></p>
          
          <h3 style="color: #4a5568; margin-top: 20px;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f7fafc;">
                <th style="text-align: left; padding: 8px;">Product</th>
                <th style="text-align: center; padding: 8px;">Quantity</th>
                <th style="text-align: right; padding: 8px;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${orderData.items
                .map(
                  (item) => `
                <tr>
                  <td style="padding: 8px;">${item.name || 'Unknown Product'}</td>
                  <td style="text-align: center; padding: 8px;">${item.quantity || 0}</td>
                  <td style="text-align: right; padding: 8px;">$${(item.price || 0).toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
              <tr>
                <td colspan="2" style="text-align: right; padding: 8px; font-weight: bold;">Subtotal:</td>
                <td style="text-align: right; padding: 8px;">$${orderData.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="text-align: right; padding: 8px; font-weight: bold;">Shipping:</td>
                <td style="text-align: right; padding: 8px;">$${orderData.shipping.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="text-align: right; padding: 8px; font-weight: bold;">Tax:</td>
                <td style="text-align: right; padding: 8px;">$${orderData.tax.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="text-align: right; padding: 8px; font-weight: bold;">Total:</td>
                <td style="text-align: right; padding: 8px;">$${orderData.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <h3 style="color: #4a5568; margin-top: 20px;">Shipping Information</h3>
          <p>
            ${orderData.shippingAddress.firstName || ''} ${orderData.shippingAddress.lastName || ''}<br>
            ${orderData.shippingAddress.address || ''}<br>
            ${orderData.shippingAddress.city || ''}, ${orderData.shippingAddress.state || ''} ${orderData.shippingAddress.zipCode || ''}<br>
            ${orderData.shippingAddress.country || ''}
          </p>
          
          ${orderData.trackingNumber !== 'Not available' ? `
          <h3 style="color: #4a5568; margin-top: 20px;">Tracking Information</h3>
          <p>Your tracking number is: <strong>${orderData.trackingNumber}</strong></p>
          ` : ''}
          
          <p style="margin-top: 20px;">Thank you for shopping with us!</p>
        </div>
      `,
    };

    await sendEmail(mailOptions);
  } catch (error) {
    console.error("Error sending order status email:", error);
    throw error;
  }
};

const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset - Rejuvenexx",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: linear-gradient(to right, #000, #0066cc); padding: 20px; color: white; text-align: center;">
          <h1>Rejuvenexx</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2>Reset Your Password</h2>
          <p>You are receiving this email because you (or someone else) has requested to reset the password for your account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          </div>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Rejuvenexx. All rights reserved.</p>
        </div>
      </div>
    `,
  }

  return await sendEmail(mailOptions);
}

const sendAffiliateStatusEmail = async (email, status) => {
  const statusMessages = {
    approved: "Your affiliate application has been approved",
    rejected: "Your affiliate application has been rejected",
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Affiliate Status Update: ${statusMessages[status]} - Rejuvenexx`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: linear-gradient(to right, #000, #0066cc); padding: 20px; color: white; text-align: center;">
          <h1>Rejuvenexx</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2>Affiliate Status Update</h2>
          ${
            status === "approved"
              ? `
            <p>Congratulations! Your application to become a Rejuvenexx affiliate has been approved.</p>
            <p>You can now log in to your affiliate dashboard to access your unique referral links and start earning commissions.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/affiliate/dashboard" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Go to Affiliate Dashboard</a>
            </div>
          `
              : `
            <p>We regret to inform you that your application to become a Rejuvenexx affiliate has been rejected.</p>
            <p>If you have any questions or would like more information about why your application was not approved, please contact our support team.</p>
          `
          }
        </div>
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Rejuvenexx. All rights reserved.</p>
        </div>
      </div>
    `,
  }

  return await sendEmail(mailOptions);
}

const sendCredentialsEmail = async (email, password) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Rejuvenexx Account Credentials",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: linear-gradient(to right, #000, #0066cc); padding: 20px; color: white; text-align: center;">
          <h1>Rejuvenexx</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2>Welcome to Rejuvenexx!</h2>
          <p>Your account has been created successfully. Here are your login credentials:</p>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          
          <p style="color: #d32f2f; font-weight: bold;">Important: For your security, please change your password immediately after logging in.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/login" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Login to Your Account</a>
          </div>
          
          <p>If you did not create this account, please contact our support team immediately.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Rejuvenexx. All rights reserved.</p>
        </div>
      </div>
    `,
  }

  return await sendEmail(mailOptions);
}

// Contact form email function
const sendContactEmail = async (formData) => {
  const { name, email, subject, message } = formData;
  console.log('formdata', formData)
  // Validate required fields
  if (!email || !name || !subject || !message) {
    console.error('Missing required fields for contact email:', { name, email, subject, message });
    return false;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('Invalid email format:', email);
    return false;
  }

  // Validate admin email
  if (!process.env.EMAIL_USER) {
    console.error('Admin email not configured in environment variables');
    return false;
  }
  
  // Send confirmation email to customer
  const customerMailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Thank you for contacting Rejuvenex",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6B46C1;">Thank you for contacting Rejuvenex!</h2>
        <p>Dear ${name},</p>
        <p>We have received your message and will get back to you as soon as possible.</p>
        <p><strong>Your message details:</strong></p>
        <ul>
          <li><strong>Subject:</strong> ${subject}</li>
          <li><strong>Message:</strong> ${message}</li>
        </ul>
        <p>Best regards,<br>The Rejuvenex Team</p>
      </div>
    `
  };

  // Send notification email to admin
  const adminMailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: `New Contact Form Submission: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6B46C1;">New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      </div>
    `
  };

  try {
    console.log('Sending contact form emails...');
    console.log('Customer email:', email);
    console.log('Admin email:', process.env.EMAIL_USER);
    
    // Send both emails
    const [customerEmailSent, adminEmailSent] = await Promise.all([
      sendEmail(customerMailOptions),
      sendEmail(adminMailOptions)
    ]);

    if (!customerEmailSent || !adminEmailSent) {
      console.error('Email sending failed:', { customerEmailSent, adminEmailSent });
      throw new Error('Failed to send one or both emails');
    }

    console.log('Contact form emails sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending contact form emails:', error);
    return false;
  }
};

const sendOrderConfirmationEmail = async (email, order) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Order Confirmation - Rejuvenexx`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: linear-gradient(to right, #000, #0066cc); padding: 20px; color: white; text-align: center;">
          <h1>Rejuvenexx</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2>Order Confirmation</h2>
          <p>Thank you for your order! Your order has been received and is being processed.</p>
          <p>Order Number: #${order._id.toString().slice(-6).toUpperCase()}</p>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
            <h3>Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #ddd;">
                <th style="text-align: left; padding: 8px;">Product</th>
                <th style="text-align: center; padding: 8px;">Quantity</th>
                <th style="text-align: right; padding: 8px;">Price</th>
              </tr>
              ${order.items
                .map(
                  (item) => `
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 8px;">${item.name}</td>
                  <td style="text-align: center; padding: 8px;">${item.quantity}</td>
                  <td style="text-align: right; padding: 8px;">$${item.price.toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
              <tr>
                <td colspan="2" style="text-align: right; padding: 8px; font-weight: bold;">Subtotal:</td>
                <td style="text-align: right; padding: 8px;">$${order.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="text-align: right; padding: 8px; font-weight: bold;">Shipping:</td>
                <td style="text-align: right; padding: 8px;">$${order.shipping.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="text-align: right; padding: 8px; font-weight: bold;">Tax:</td>
                <td style="text-align: right; padding: 8px;">$${order.tax.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="text-align: right; padding: 8px; font-weight: bold;">Total:</td>
                <td style="text-align: right; padding: 8px; font-weight: bold;">$${order.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
            <h3>Shipping Information</h3>
            <p>${order.shippingAddress.firstName} ${order.shippingAddress.lastName}</p>
            <p>${order.shippingAddress.address}${order.shippingAddress.apartment ? `, ${order.shippingAddress.apartment}` : ''}</p>
            <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}</p>
            <p>${order.shippingAddress.country}</p>
            <p>Phone: ${order.shippingAddress.phone}</p>
          </div>
          
          <p>We'll send you another email when your order ships.</p>
          <p>Thank you for shopping with Rejuvenexx!</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Rejuvenexx. All rights reserved.</p>
        </div>
      </div>
    `,
  }

  return await sendEmail(mailOptions);
}

// Send order notification to admin
const sendOrderNotificationToAdmin = async (order) => {
  const adminEmail = process.env.EMAIL_USER; // Using the same email as the sender
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject: `New Order Received - Order #${order._id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">New Order Received</h2>
        
        <div style="margin-bottom: 20px;">
          <p><strong>Order Number:</strong> ${order._id}</p>
          <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
          <p><strong>Status:</strong> <span style="color: #f59e0b;">${order.status}</span></p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333; font-size: 16px;">Customer Information</h3>
          <p><strong>Name:</strong> ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}</p>
          <p><strong>Email:</strong> ${order.shippingAddress.email}</p>
          <p><strong>Phone:</strong> ${order.shippingAddress.phone || 'Not provided'}</p>
          <p><strong>Address:</strong> ${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}, ${order.shippingAddress.country}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333; font-size: 16px;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">Product</th>
                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">Quantity</th>
                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">Price</th>
                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$${item.price.toFixed(2)}</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="text-align: right; margin-top: 10px;">
            <p><strong>Subtotal:</strong> $${order.subtotal.toFixed(2)}</p>
            <p><strong>Shipping:</strong> $${order.shipping.cost.toFixed(2)}</p>
            <p><strong>Tax:</strong> $${order.tax.toFixed(2)}</p>
            <p style="font-size: 18px; font-weight: bold; margin-top: 10px;"><strong>Total:</strong> $${order.total.toFixed(2)}</p>
          </div>
        </div>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #6b7280; font-size: 14px;">
          <p>This is an automated notification from your e-commerce system.</p>
          <p>Please log in to your admin dashboard to process this order.</p>
        </div>
      </div>
    `,
  };

  return sendEmail(mailOptions);
};

// Export all functions
module.exports = {
  sendVerificationEmail,
  sendOrderStatusEmail,
  sendPasswordResetEmail,
  sendAffiliateStatusEmail,
  sendCredentialsEmail,
  sendContactEmail,
  sendOrderConfirmationEmail,
  sendOrderNotificationToAdmin,
};
