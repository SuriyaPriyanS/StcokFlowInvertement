import nodemailer from "nodemailer";
import { Queue, Worker } from "bullmq";
import { getBullMQConnection } from "../config/bullmq.js";

const connection = getBullMQConnection();

// Create Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io",
  port: parseInt(process.env.SMTP_PORT || "2525", 10),
  auth: {
    user: process.env.SMTP_USER || "mockuser",
    pass: process.env.SMTP_PASS || "mockpass",
  },
});

// Verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Transporter connection error:", error.message);
  } else {
    console.log("SMTP Server is ready to take messages");
  }
});

// Core function to send email
const sendMailDirect = async ({ to, subject, html }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || "alerts@stockflow.com",
    to,
    subject,
    html,
  };
  return await transporter.sendMail(mailOptions);
};

// 1. Create BullMQ Queue for sending emails
const emailQueue = new Queue("EmailQueue", { connection });

// 2. Function to add jobs to the queue
const addEmailToQueue = async (to, subject, html) => {
  try {
    await emailQueue.add("send-email", { to, subject, html });
    console.log(`Email job added to queue for: ${to}`);
  } catch (error) {
    console.error("Failed to add email to queue:", error.message);
  }
};

// 3. Create Worker to process email jobs in background
const emailWorker = new Worker(
  "EmailQueue",
  async (job) => {
    console.log(`Processing email job ${job.id} for: ${job.data.to}`);
    const { to, subject, html } = job.data;
    await sendMailDirect({ to, subject, html });
    console.log(`Email successfully sent for job ${job.id}`);
  },
  { connection }
);

emailWorker.on("failed", (job, err) => {
  console.error(`Email job ${job ? job.id : "unknown"} failed:`, err.message);
});

export {
  addEmailToQueue,
  sendMailDirect,
  emailQueue,
  emailWorker,
};
