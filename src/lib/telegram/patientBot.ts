import { Bot, InlineKeyboard, session, type SessionFlavor, type Context } from "grammy";
import { connectDB } from "@/lib/db";
import Hospital from "@/models/Hospital";
import Department from "@/models/Department";
import { createFeedback, DepartmentNotFoundError } from "@/lib/createFeedback";
import { speechToText } from "@/lib/voice";

// Session state is IN-MEMORY ONLY and deliberately never persisted to MongoDB —
// it exists purely to remember which department the patient picked between
// messages in the same conversation. If the serverless function cold-starts
// between "pick department" and "send message", the session resets and the
// patient is asked to /start again; that trade-off is intentional so that no
// Telegram-identifying data (chat_id included) ever touches the database. See
// the anonymity checklist for the full audit of what does get written.
//
// IMPORTANT: grammY's session middleware only writes `ctx.session` back if the
// handler returns without throwing ("no catch: do not write back if middleware
// throws" — see node_modules/grammy/out/convenience/session.js). That means
// every outbound Telegram API call (reply/answerCallbackQuery/editMessageText)
// that happens AFTER a session mutation must never be allowed to throw, or a
// transient send failure would silently roll back the department selection.
// safeSend() below exists exactly for that.
type SessionData = { departmentId?: string; hospitalId?: string };
type BotContext = Context & SessionFlavor<SessionData>;

let bot: Bot<BotContext> | null = null;

async function safeSend(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    console.error(`[patientBot] ${label} failed (session state is unaffected):`, error);
  }
}

async function departmentKeyboard(hospitalId: string) {
  const departments = await Department.find({ hospitalId }).select("name").lean();
  const keyboard = new InlineKeyboard();
  for (const dept of departments) {
    keyboard.text(dept.name, `dept:${dept._id}`).row();
  }
  return keyboard;
}

export function getPatientBot() {
  if (bot) return bot;

  const token = process.env.TELEGRAM_PATIENT_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_PATIENT_BOT_TOKEN is not set");

  bot = new Bot<BotContext>(token);
  bot.catch((err) => {
    console.error("[patientBot] Unhandled error (long-polling path only):", err.error);
  });
  bot.use(session({ initial: (): SessionData => ({}) }));

  bot.command("start", async (ctx) => {
    await connectDB();

    const payloadHospitalId = ctx.match?.trim();
    const hospital = payloadHospitalId
      ? await Hospital.findById(payloadHospitalId).lean()
      : await Hospital.findOne().lean();

    if (!hospital) {
      await safeSend("start/not-found reply", () =>
        ctx.reply("Shifoxona topilmadi. QR-kartadagi havola orqali qaytadan urinib ko'ring.")
      );
      return;
    }

    ctx.session.hospitalId = String(hospital._id);
    ctx.session.departmentId = undefined;

    const keyboard = await departmentKeyboard(String(hospital._id));
    await safeSend("start reply", () =>
      ctx.reply(
        "Assalomu alaykum! BemorOvozi orqali fikringiz yoki shikoyatingizni to'liq anonim tarzda bildirishingiz mumkin.\n\n" +
          "Avval qaysi bo'lim yoki xona haqida ekanini tanlang:",
        { reply_markup: keyboard }
      )
    );
  });

  bot.callbackQuery(/^dept:(.+)$/, async (ctx) => {
    await connectDB();
    const departmentId = ctx.match[1];
    const department = await Department.findById(departmentId).lean();
    if (!department) {
      await safeSend("dept/not-found answer", () =>
        ctx.answerCallbackQuery({ text: "Bo'lim topilmadi.", show_alert: true })
      );
      return;
    }

    ctx.session.departmentId = departmentId;
    ctx.session.hospitalId = String(department.hospitalId);

    await safeSend("dept answerCallbackQuery", () => ctx.answerCallbackQuery());
    await safeSend("dept editMessageText", () =>
      ctx.editMessageText(
        `📍 ${department.name}\n\n` +
          "Endi xabaringizni yozing yoki ovozli xabar yuboring. To'liq anonim — ismingiz so'ralmaydi va saqlanmaydi."
      )
    );
  });

  async function handleTranscript(ctx: BotContext, transcript: string, channel: "text" | "voice") {
    if (!ctx.session.departmentId || !ctx.session.hospitalId) {
      await safeSend("no-department reply", () =>
        ctx.reply("Avval bo'limni tanlang — buning uchun /start ni bosing.")
      );
      return;
    }

    let trackingCode: string;
    try {
      const feedback = await createFeedback({
        hospitalId: ctx.session.hospitalId,
        departmentId: ctx.session.departmentId,
        channel,
        transcript,
        source: "telegram",
      });
      trackingCode = feedback.trackingCode;
    } catch (error) {
      const message =
        error instanceof DepartmentNotFoundError
          ? "Bo'lim topilmadi. /start orqali qaytadan tanlang."
          : "Kutilmagan xatolik yuz berdi. Birozdan so'ng qaytadan urinib ko'ring.";
      if (!(error instanceof DepartmentNotFoundError)) console.error("[patientBot] Failed to create feedback:", error);
      await safeSend("create-feedback error reply", () => ctx.reply(message));
      return;
    }

    // One report per conversation — a fresh /start is required for the next one,
    // so a stray follow-up message is never silently attributed to an old pick.
    // Set before the reply attempt so it survives even if that reply fails.
    ctx.session.departmentId = undefined;

    await safeSend("confirmation reply", () =>
      ctx.reply(
        "✅ Rahmat! Xabaringiz qabul qilindi va tegishli bo'limga yuborildi.\n\n" +
          `Kuzatish kodingiz: <b>${trackingCode}</b>\n` +
          "Ushbu kod orqali holatni istalgan vaqt tekshirishingiz mumkin.",
        { parse_mode: "HTML" }
      )
    );
  }

  bot.on("message:text", async (ctx) => {
    if (ctx.message.text.startsWith("/")) return; // unknown commands fall through silently
    await handleTranscript(ctx, ctx.message.text, "text");
  });

  bot.on("message:voice", async (ctx) => {
    try {
      const file = await ctx.getFile();
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`Failed to download voice file: ${res.status}`);
      // Held only in memory for the duration of this request — never written to
      // disk or any storage bucket, and discarded as soon as STT returns.
      const audio = Buffer.from(await res.arrayBuffer());

      const transcript = await speechToText(audio, "audio/ogg");
      await handleTranscript(ctx, transcript, "voice");
    } catch (error) {
      console.error("[patientBot] Voice processing failed:", error);
      await safeSend("voice-error reply", () =>
        ctx.reply("Ovozli xabarni qayta ishlab bo'lmadi. Iltimos, matn sifatida yozib ko'ring.")
      );
    }
  });

  return bot;
}
