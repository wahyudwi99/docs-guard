import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 });
    }

    // Send email using nodemailer
    // Note: You must configure SMTP_USER and SMTP_PASS in your .env.local file
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER || 'xponential.labs@gmail.com',
        pass: process.env.SMTP_PASS || '', 
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER || 'xponential.labs@gmail.com', // Always send from the authenticated user
      replyTo: email,
      to: 'xponential.labs@gmail.com', // Fixed destination
      subject: `[Docs Guard - Question from ${name}]`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Email sent successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Email sending error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
