export function buildWinbackMessage(input: {
  customerName: string | null;
  couponCode: string;
  segment: string;
  storeName?: string | null;
}): { template: string; body: string } {
  const firstName = (input.customerName ?? 'Cliente').split(' ')[0] || 'Cliente';
  const store = input.storeName ? ` da ${input.storeName}` : '';
  const templates: Record<string, string> = {
    at_risk: `Olá ${firstName}! Sentimos sua falta${store}. Use o cupom ${input.couponCode} e aproveite FRETE GRÁTIS por 48h.`,
    inactive: `Olá ${firstName}! Faz tempo que não te vemos${store}. Use ${input.couponCode} e ganhe R$10 de desconto por 48h.`,
    lost: `${firstName}, que saudade${store}! Volte com 15% OFF usando ${input.couponCode} (válido por 48h).`,
    payment_failed: `${firstName}, seu pagamento anterior não foi concluído. Volte com o cupom ${input.couponCode} e finalize seu pedido.`,
    order_status_changed: `${firstName}, temos novidades${store}. Use ${input.couponCode} e aproveite uma oferta especial hoje.`,
  };
  const template = input.segment in templates ? input.segment : 'at_risk';
  return { template, body: templates[template] };
}
