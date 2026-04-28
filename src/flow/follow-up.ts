import type { InquiryEvent } from "../types";

export interface FollowUpDecision {
  shouldFollowUp: boolean;
  reason: string;
  nextActionAtHours: number;
  draftSubject?: string;
  draftBody?: string;
}

export function planFollowUp(event: InquiryEvent, hoursSinceSent: number): FollowUpDecision {
  if (!event.isBusiness || !event.draft) {
    return { shouldFollowUp: false, reason: "非业务/无草稿", nextActionAtHours: 0 };
  }
  if (event.customerReply) {
    return { shouldFollowUp: false, reason: "客户已回复，进入议价阶段", nextActionAtHours: 0 };
  }
  if (hoursSinceSent < 72) {
    return {
      shouldFollowUp: false,
      reason: `已发送 ${hoursSinceSent}h，未到 72h 跟进窗口`,
      nextActionAtHours: 72 - hoursSinceSent,
    };
  }

  const lang = event.language;
  const inquirySubject = event.draft.subject.replace(/^Re:\s*/i, "");
  const tail = event.parsed?.intentSummary || inquirySubject;
  const draftSubject =
    lang === "en"
      ? `Following up: ${inquirySubject}`
      : lang === "es"
        ? `Seguimiento: ${inquirySubject}`
        : `Напоминание: ${inquirySubject}`;
  const draftBody =
    lang === "en"
      ? `Hi,\n\nJust circling back on the quotation for ${tail}. We can hold the quoted prices and lead time if confirmed this week. Let me know if any spec needs adjustment.\n\nBest,\nAria · Sales Assistant`
      : lang === "es"
        ? `Hola,\n\nRetomando la cotización sobre ${tail}. Podemos mantener los precios y tiempos si se confirma esta semana. Avíseme si algún detalle requiere ajuste.\n\nSaludos,\nAria · Asistente de Ventas`
        : `Здравствуйте,\n\nВозвращаемся к нашему предложению по ${tail}. Цены и сроки остаются в силе при подтверждении на этой неделе. Сообщите, если требуются корректировки.\n\nС уважением,\nAria · Помощник отдела продаж`;

  return {
    shouldFollowUp: true,
    reason: `已发送 ${hoursSinceSent}h，触发 72h 沉默跟进`,
    nextActionAtHours: 72,
    draftSubject,
    draftBody,
  };
}
