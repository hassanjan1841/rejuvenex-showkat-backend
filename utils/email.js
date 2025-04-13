const nodemailer = require("nodemailer")
const dns = require('dns').promises;

// Create reusable transporter
const createEmailTransporter = async () => {
  console.log('Creating email transporter...');
  
  // Check if required environment variables are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Missing environment variables:');
    console.error('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
    console.error('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Not set');
    throw new Error('Email configuration missing. Please check EMAIL_USER and EMAIL_PASS in .env file');
  }

  console.log('Email credentials found, attempting DNS resolution...');

  // Verify DNS resolution first
  try {
    const dnsResult = await dns.lookup('smtp.gmail.com');
    console.log('DNS resolution successful for smtp.gmail.com:', dnsResult);
  } catch (error) {
    console.error('DNS resolution failed:', error);
    throw new Error('Cannot resolve smtp.gmail.com. Please check your internet connection and DNS settings.');
  }

  console.log('Creating Nodemailer transporter with the following configuration:');
  console.log('- Service: gmail');
  console.log('- Host: smtp.gmail.com');
  console.log('- Port: 587');
  console.log('- Secure: false');
  console.log('- Auth user:', process.env.EMAIL_USER);
  console.log('- Auth pass: [HIDDEN]');
  
  // Create transporter with retry logic
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
      minVersion: 'TLSv1.2'
    },
    debug: true,
    logger: true,
    maxConnections: 1,
    pool: true,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5
  });

  // Add event listeners for debugging
  transporter.on('idle', () => {
    console.log('SMTP connection is idle');
  });
  
  transporter.on('error', (err) => {
    console.error('SMTP transporter error:', err);
  });

  // Verify transporter configuration
  console.log('Verifying SMTP transporter configuration...');
  try {
    const verifyResult = await transporter.verify();
    console.log('SMTP verification result:', verifyResult);
    console.log('SMTP server is ready to send messages');
    return transporter;
  } catch (error) {
    console.error('SMTP verification failed with error code:', error.code);
    console.error('SMTP verification error message:', error.message);
    console.error('SMTP verification error stack:', error.stack);
    
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. This is likely due to incorrect credentials or Gmail security settings.');
      console.error('For Gmail, make sure you are using an App Password, not your regular password.');
      console.error('See README.md for instructions on setting up Gmail App Password.');
    } else if (error.code === 'ECONNECTION') {
      console.error('Connection failed. This could be due to network issues or firewall settings.');
    } else if (error.code === 'ESOCKET') {
      console.error('Socket error. The email server might be down or unreachable.');
    }
    
    throw new Error(`SMTP verification failed: ${error.message}`);
  }
};

// Helper function to send email with retry logic
const sendEmail = async (mailOptions, maxRetries = 3) => {
  console.log('Preparing to send email with options:', {
    from: mailOptions.from,
    to: mailOptions.to,
    subject: mailOptions.subject,
    // Don't log the full HTML content as it might be large
    hasHtml: !!mailOptions.html,
    hasText: !!mailOptions.text
  });
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} of ${maxRetries} to send email...`);
      const transporter = await createEmailTransporter();
      
      console.log('Sending email...');
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully!');
      console.log('Message ID:', info.messageId);
      console.log('Response from server:', info.response);
      return info;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed with error code:`, error.code);
      console.error(`Attempt ${attempt} error message:`, error.message);
      console.error(`Attempt ${attempt} error stack:`, error.stack);
      
      if (error.code === 'EAUTH') {
        console.error('Authentication failed. This is likely due to incorrect credentials or Gmail security settings.');
        console.error('For Gmail, make sure you are using an App Password, not your regular password.');
      } else if (error.code === 'ECONNECTION') {
        console.error('Connection failed. This could be due to network issues or firewall settings.');
      } else if (error.code === 'ESOCKET') {
        console.error('Socket error. The email server might be down or unreachable.');
      }
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed to send email after ${maxRetries} attempts. Last error: ${lastError.message}`);
};

exports.sendVerificationEmail = async (email, token) => {
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

exports.sendOrderStatusEmail = async (email, order) => {
  const statusMessages = {
    processing: "Your order is being processed",
    shipped: "Your order has been shipped",
    delivered: "Your order has been delivered",
    cancelled: "Your order has been cancelled",
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Order Update: ${statusMessages[order.status]} - Rejuvenexx`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: linear-gradient(to right, #000, #0066cc); padding: 20px; color: white; text-align: center;">
          <h1>Rejuvenexx</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2>Order Update</h2>
          <p>Your order #${order._id.toString().slice(-6).toUpperCase()} has been ${order.status}.</p>
          
          ${order.status === "shipped" ? `<p>Tracking Number: ${order.trackingNumber}</p>` : ""}
          
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

exports.sendPasswordResetEmail = async (email, token) => {
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

exports.sendAffiliateStatusEmail = async (email, status) => {
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

exports.sendCredentialsEmail = async (email, password) => {
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
