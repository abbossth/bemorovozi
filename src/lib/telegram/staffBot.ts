import { Bot, InlineKeyboard } from "grammy";
import { connectDB } from "@/lib/db";
import Staff from "@/models/Staff";
import TelegramLinkToken from "@/models/TelegramLinkToken";
import Feedback from "@/models/Feedback";
import TelegramNotification from "@/models/TelegramNotification";
import { escapeHtml, SEVERITY_LABEL } from "./format";

let bot: Bot | null = null;

export function buildFeedbackKeyboard(feedbackId: string) {
  return new InlineKeyboard()
    .text("👀 Ko'rib chiqilmoqda", `act:review:${feedbackId}`)
    .text("✅ Hal qilindi", `act:resolve:${feedbackId}`);
}

export function buildNotificationText(params: {
  departmentName: string;
  severity: keyof typeof SEVERITY_LABEL;
  transcript: string;
  trackingCode: string;
  createdAt: Date;
  /** staff-conduct complaint: skips the department and goes straight to management */
  routedToManagement?: boolean;
  /** "shikoyat" | "taklif" — only known for AI-conversation submissions */
  kind?: string;
  roomOrWard?: string;
  staffName?: string;
  occurredAt?: string;
}) {
  const time = params.createdAt.toLocaleString("uz-UZ", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const details = [
    params.roomOrWard && `🚪 Xona/palata: ${escapeHtml(params.roomOrWard)}`,
    params.staffName && `👤 Xodim: ${escapeHtml(params.staffName)}`,
    params.occurredAt && `⏱ Qachon: ${escapeHtml(params.occurredAt)}`,
  ].filter(Boolean);
  const kindLabel = params.kind === "taklif" ? "taklif" : "xabar";
  return (
    (params.routedToManagement ? "🏛 <b>Rahbariyatga yo'naltirilgan</b>\n" : "") +
    `${SEVERITY_LABEL[params.severity]} jiddiylikdagi yangi ${kindLabel}\n\n` +
    `📍 <b>${escapeHtml(params.departmentName)}</b>\n` +
    `🕐 ${time}\n` +
    `🔖 ${params.trackingCode}\n` +
    (details.length ? `${details.join("\n")}\n` : "") +
    `\n${escapeHtml(params.transcript)}`
  );
}

function actionStatusLine(action: "review" | "resolve", staffName: string) {
  return action === "review"
    ? `\n\n👀 <b>${staffName}</b> tomonidan ko'rib chiqilmoqda`
    : `\n\n✅ <b>${staffName}</b> tomonidan hal qilindi`;
}

export function getStaffBot() {
  if (bot) return bot;

  const token = process.env.TELEGRAM_STAFF_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_STAFF_BOT_TOKEN is not set");

  bot = new Bot(token);

  // Only fires if this bot is ever run via long-polling (e.g. a local test
  // script with bot.start()) — handleUpdate(), used by the webhook route,
  // does not consult this handler; see that route's own try/catch instead.
  bot.catch((err) => {
    console.error("[staffBot] Unhandled error (long-polling path only):", err.error);
  });

  bot.command("start", async (ctx) => {
    const token = ctx.match?.trim();
    await connectDB();

    if (!token) {
      await ctx.reply(
        "Salom! Bu bot BemorOvozi shifoxona xodimlari uchun bildirishnomalar yuboradi.\n\n" +
          "Hisobingizni ulash uchun Boshqaruv paneli → Sozlamalar → \"Telegram orqali ulash\" tugmasini bosing."
      );
      return;
    }

    const linkToken = await TelegramLinkToken.findOne({ token, used: false });
    if (!linkToken) {
      await ctx.reply("Havola muddati o'tgan yoki noto'g'ri. Sozlamalar sahifasidan qaytadan urinib ko'ring.");
      return;
    }

    const staff = await Staff.findByIdAndUpdate(
      linkToken.staffId,
      { telegramChatId: ctx.chat.id },
      { new: true }
    );
    linkToken.used = true;
    await linkToken.save();

    if (!staff) {
      await ctx.reply("Xodim topilmadi. Ma'muriyat bilan bog'laning.");
      return;
    }

    await ctx.reply(
      `✅ Hisobingiz ulandi, ${staff.name}!\n\n` +
        "Endi yuqori jiddiylikdagi xabarlar haqida shu yerda bildirishnoma olasiz.\n" +
        "Ulanishni bekor qilish uchun /uzish buyrug'ini yuboring."
    );
  });

  bot.command("uzish", async (ctx) => {
    await connectDB();
    const staff = await Staff.findOneAndUpdate(
      { telegramChatId: ctx.chat.id },
      { $unset: { telegramChatId: 1 } }
    );
    await ctx.reply(
      staff ? "Telegram ulanishi bekor qilindi." : "Sizning hisobingiz ulanmagan edi."
    );
  });

  bot.callbackQuery(/^act:(review|resolve):(.+)$/, async (ctx) => {
    const action = ctx.match[1] as "review" | "resolve";
    const feedbackId = ctx.match[2];

    await connectDB();

    const staff = await Staff.findOne({ telegramChatId: ctx.chat?.id });
    if (!staff) {
      await ctx.answerCallbackQuery({ text: "Hisobingiz topilmadi.", show_alert: true });
      return;
    }

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      await ctx.answerCallbackQuery({ text: "Xabar topilmadi.", show_alert: true });
      return;
    }

    const nextStatus = action === "review" ? "korib_chiqilmoqda" : "hal_qilindi";
    const alreadyHandled =
      (action === "review" && feedback.status !== "yangi") ||
      (action === "resolve" && feedback.status === "hal_qilindi");

    if (alreadyHandled) {
      await ctx.answerCallbackQuery({ text: "Bu xabar allaqachon ko'rib chiqilgan.", show_alert: false });
      return;
    }

    feedback.status = nextStatus;
    await feedback.save();

    const statusLine = actionStatusLine(action, staff.name);
    const keyboard = action === "resolve" ? undefined : new InlineKeyboard().text("✅ Hal qilindi", `act:resolve:${feedbackId}`);

    const notifications = await TelegramNotification.find({ feedbackId });
    await Promise.all(
      notifications.map(async (n) => {
        try {
          await ctx.api.editMessageText(n.chatId, n.messageId, `${n.baseText}${statusLine}`, {
            parse_mode: "HTML",
            reply_markup: keyboard,
          });
        } catch (error) {
          console.error("[staffBot] Failed to edit notification copy:", error);
        }
      })
    );

    await ctx.answerCallbackQuery({ text: action === "review" ? "Ko'rib chiqilmoqda deb belgilandi" : "Hal qilindi deb belgilandi" });
  });

  return bot;
}
