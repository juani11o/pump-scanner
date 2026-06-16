import os
from dotenv import load_dotenv
load_dotenv()
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("EmailDispatcher")

SMTP_HOST = os.environ.get("SMTP_HOST", "localhost")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "1025"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", "noreply@pump-scanner.com")
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "Pump Scanner")

def send_email(to_email: str, subject: str, html_content: str):
    """General function to send email via SMTP."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
    msg["To"] = to_email

    msg.attach(MIMEText(html_content, "html"))

    try:
        # Check if port is SSL (465) or standard / STARTTLS
        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
            # Use EHLO and STARTTLS if port is typical submission port (587) or user is configured
            if SMTP_PORT == 587 or SMTP_USER:
                server.ehlo()
                server.starttls()
                server.ehlo()

        if SMTP_USER and SMTP_PASSWORD:
            server.login(SMTP_USER, SMTP_PASSWORD)

        server.sendmail(SMTP_FROM_EMAIL, to_email, msg.as_string())
        server.quit()
        logger.info(f"📧 Email successfully sent to {to_email} with subject: '{subject}'")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to send email to {to_email} via {SMTP_HOST}:{SMTP_PORT}. Error: {e}")
        return False

def send_confirmation_email(email: str, name: str, code: str):
    subject = "Verify Your Pump Scanner Account"
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; border: 1px solid #e0e0e0;">
          <h2 style="color: #6366f1;">Welcome to Pump Scanner, {name}!</h2>
          <p>Thank you for signing up. Please verify your email address by using the confirmation code below:</p>
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0; color: #1f2937;">
            {code}
          </div>
          <p style="font-size: 13px; color: #666;">This code is valid for 24 hours. If you did not register for this account, please ignore this email.</p>
        </div>
      </body>
    </html>
    """
    return send_email(email, subject, html_content)

def send_password_reset_email(email: str, token: str):
    subject = "Reset Your Pump Scanner Password"
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; border: 1px solid #e0e0e0;">
          <h2 style="color: #e11d48;">Password Reset Request</h2>
          <p>We received a request to reset your password. Use the verification token code below to complete the reset process:</p>
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0; color: #1f2937;">
            {token}
          </div>
          <p style="font-size: 13px; color: #666;">If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
        </div>
      </body>
    </html>
    """
    return send_email(email, subject, html_content)
