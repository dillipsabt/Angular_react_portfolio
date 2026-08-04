import dns from "node:dns";
import { MongoClient } from "mongodb";
import nodemailer from "nodemailer";

dns.setDefaultResultOrder("ipv4first");
import { z } from "zod";
import type { RequestHandler } from "express";

const contactSchema = z.object({
  company: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  companyWebsite: z.union([z.string().trim().url().max(300), z.literal("")]).optional(),
  role: z.string().trim().max(160).optional(),
  jobDescription: z.string().trim().min(20).max(10000),
  message: z.string().trim().max(5000).optional(),
});

let mongoClient: MongoClient | undefined;

async function getDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");
  mongoClient ??= new MongoClient(uri);
  await mongoClient.connect();
  return mongoClient.db(process.env.MONGODB_DATABASE ?? "dillip_portfolio");
}

function getMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) throw new Error("SMTP configuration is incomplete");
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

export const handleContactInquiry: RequestHandler = async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Please provide valid company and job details." });
    return;
  }

  try {
    const inquiry = { ...parsed.data, createdAt: new Date(), source: "portfolio-contact" };
    const database = await getDatabase();
    await database.collection("contact_inquiries").insertOne(inquiry);

    const recipient = process.env.CONTACT_EMAIL ?? "dillipsabat442@gmail.com";
    const sender = process.env.SMTP_FROM ?? process.env.SMTP_USER;
    await getMailer().sendMail({
      from: sender,
      to: recipient,
      replyTo: inquiry.email,
      subject: `New opportunity from ${inquiry.company}${inquiry.role ? ` — ${inquiry.role}` : ""}`,
      text: [
        `Company: ${inquiry.company}`,
        `Contact: ${inquiry.contactName}`,
        `Email: ${inquiry.email}`,
        `Website: ${inquiry.companyWebsite || "Not provided"}`,
        `Role: ${inquiry.role || "Not provided"}`,
        "",
        "Job Description:",
        inquiry.jobDescription,
        "",
        "Message:",
        inquiry.message || "Not provided",
      ].join("\n"),
    });

    res.status(201).json({ message: "Thanks. Your opportunity has been sent successfully." });
  } catch (error) {
    console.error("Contact inquiry failed:", error);
    res.status(503).json({ message: "The contact service is temporarily unavailable. Please email Dillip directly." });
  }
};
