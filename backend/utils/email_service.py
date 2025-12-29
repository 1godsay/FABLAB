import os
import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from typing import Optional

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.api_key = os.getenv('SENDGRID_API_KEY')
        self.sender_email = os.getenv('SENDGRID_SENDER_EMAIL', 'noreply@fablab.com')
        self.sender_name = os.getenv('SENDGRID_SENDER_NAME', 'FABLAB')
        
        if self.api_key:
            self.client = SendGridAPIClient(self.api_key)
            logger.info("SendGrid Email Service initialized")
        else:
            self.client = None
            logger.warning("SendGrid API key not configured - emails will be logged only")
    
    def send_email(self, to_email: str, subject: str, html_content: str, plain_content: Optional[str] = None) -> bool:
        """Send an email via SendGrid"""
        if not self.client:
            logger.info(f"[EMAIL MOCK] To: {to_email}, Subject: {subject}")
            logger.info(f"[EMAIL MOCK] Content: {html_content[:200]}...")
            return True
        
        try:
            message = Mail(
                from_email=Email(self.sender_email, self.sender_name),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content)
            )
            
            if plain_content:
                message.add_content(Content("text/plain", plain_content))
            
            response = self.client.send(message)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"Failed to send email: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return False
    
    def send_order_confirmation(self, buyer_email: str, buyer_name: str, order_details: dict) -> bool:
        """Send order confirmation email to buyer"""
        subject = f"Order Confirmed - FABLAB #{order_details['order_id'][:8]}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #FF4D00; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #f9f9f9; }}
                .order-details {{ background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }}
                .total {{ font-size: 24px; color: #FF4D00; font-weight: bold; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
                .status {{ display: inline-block; background: #e3f2fd; color: #1976d2; padding: 5px 15px; border-radius: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>FABLAB</h1>
                    <p>Order Confirmation</p>
                </div>
                <div class="content">
                    <p>Hi {buyer_name},</p>
                    <p>Thank you for your order! We've received your order and it's being processed.</p>
                    
                    <div class="order-details">
                        <h3>Order Details</h3>
                        <p><strong>Order ID:</strong> {order_details['order_id']}</p>
                        <p><strong>Product:</strong> {order_details['product_name']}</p>
                        <p><strong>Quantity:</strong> {order_details['quantity']}</p>
                        <p><strong>Material:</strong> {order_details.get('material', 'N/A')}</p>
                        <p class="total">Total: ₹{order_details['total_amount']}</p>
                        <p><strong>Status:</strong> <span class="status">{order_details['status']}</span></p>
                    </div>
                    
                    <p>You can track your order status in your <a href="{os.getenv('FRONTEND_URL', 'https://fablab.com')}/orders">Orders Page</a>.</p>
                    
                    <p>If you have any questions, feel free to reach out to us.</p>
                    
                    <p>Best regards,<br>The FABLAB Team</p>
                </div>
                <div class="footer">
                    <p>© 2025 FABLAB. All rights reserved.</p>
                    <p>This is an automated message, please do not reply directly to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(buyer_email, subject, html_content)
    
    def send_order_status_update(self, buyer_email: str, buyer_name: str, order_details: dict, new_status: str) -> bool:
        """Send order status update email to buyer"""
        status_messages = {
            'Printing': "Great news! Your order is now being printed.",
            'Post-processing': "Your print is complete and now in post-processing (cleaning, curing, etc.).",
            'Shipped': "Your order has been shipped! It's on its way to you.",
            'Delivered': "Your order has been delivered. We hope you love it!"
        }
        
        status_message = status_messages.get(new_status, f"Your order status has been updated to: {new_status}")
        
        subject = f"Order Update - {new_status} - FABLAB #{order_details['order_id'][:8]}"
        
        # Progress bar HTML
        statuses = ['Order placed', 'Printing', 'Post-processing', 'Shipped', 'Delivered']
        current_index = statuses.index(new_status) if new_status in statuses else 0
        
        progress_html = ""
        for i, s in enumerate(statuses):
            is_active = i <= current_index
            color = "#FF4D00" if is_active else "#ddd"
            progress_html += f'<div style="flex:1; text-align:center;"><div style="width:30px; height:30px; background:{color}; color:white; border-radius:50%; margin:0 auto; line-height:30px;">{i+1}</div><p style="font-size:10px; margin-top:5px;">{s}</p></div>'
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #FF4D00; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #f9f9f9; }}
                .status-box {{ background: white; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center; }}
                .status {{ font-size: 28px; color: #FF4D00; font-weight: bold; }}
                .progress {{ display: flex; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>FABLAB</h1>
                    <p>Order Status Update</p>
                </div>
                <div class="content">
                    <p>Hi {buyer_name},</p>
                    <p>{status_message}</p>
                    
                    <div class="status-box">
                        <p class="status">{new_status}</p>
                        <div class="progress">
                            {progress_html}
                        </div>
                    </div>
                    
                    <p><strong>Order ID:</strong> {order_details['order_id']}</p>
                    <p><strong>Product:</strong> {order_details['product_name']}</p>
                    
                    <p>Track your order: <a href="{os.getenv('FRONTEND_URL', 'https://fablab.com')}/orders">View Orders</a></p>
                    
                    <p>Best regards,<br>The FABLAB Team</p>
                </div>
                <div class="footer">
                    <p>© 2025 FABLAB. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(buyer_email, subject, html_content)
    
    def send_new_order_notification_to_seller(self, seller_email: str, seller_name: str, order_details: dict) -> bool:
        """Send new order notification to seller"""
        subject = f"New Order Received! - FABLAB #{order_details['order_id'][:8]}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #22c55e; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #f9f9f9; }}
                .order-details {{ background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }}
                .amount {{ font-size: 24px; color: #22c55e; font-weight: bold; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 New Order!</h1>
                </div>
                <div class="content">
                    <p>Hi {seller_name},</p>
                    <p>Great news! You've received a new order for your product.</p>
                    
                    <div class="order-details">
                        <h3>Order Details</h3>
                        <p><strong>Order ID:</strong> {order_details['order_id']}</p>
                        <p><strong>Product:</strong> {order_details['product_name']}</p>
                        <p><strong>Quantity:</strong> {order_details['quantity']}</p>
                        <p class="amount">Amount: ₹{order_details['total_amount']}</p>
                    </div>
                    
                    <p>Please start processing this order as soon as possible.</p>
                    
                    <p>Best regards,<br>The FABLAB Team</p>
                </div>
                <div class="footer">
                    <p>© 2025 FABLAB. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(seller_email, subject, html_content)

# Singleton instance
email_service = EmailService()
