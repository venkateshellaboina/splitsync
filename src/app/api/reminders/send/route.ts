import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

interface SendReminderBody {
  smtp: {
    host: string;
    port: number;
    email: string;
    appPassword: string;
  };
  to: string;
  subject: string;
  body: string;
}

export async function POST(request: NextRequest) {
  let payload: SendReminderBody;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { smtp, to, subject, body } = payload ?? {};

  if (!smtp?.host || !smtp.port || !smtp.email || !smtp.appPassword) {
    return NextResponse.json(
      { error: "Missing email settings. Configure Email Reminders first." },
      { status: 400 }
    );
  }
  if (!to || !subject || !body) {
    return NextResponse.json(
      { error: "Missing recipient, subject, or body" },
      { status: 400 }
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.email,
        pass: smtp.appPassword,
      },
    });

    await transporter.sendMail({
      from: smtp.email,
      to,
      subject,
      text: body,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
