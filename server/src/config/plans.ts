export interface Plan {
  name: string;
  price: number;       // kuruş cinsinden
  tokens: number;
  interval: 'month';
  stripePriceId: string;
}

export const PLANS: Record<'STARTER' | 'PRO', Plan> = {
  STARTER: {
    name: 'Starter',
    price: 9900,       // 99 TL
    tokens: 50,
    interval: 'month',
    stripePriceId: 'price_1TRcje2Nx5ehm1a89d7oDYxv',
  },
  PRO: {
    name: 'Pro',
    price: 24900,      // 249 TL
    tokens: 999999,    // sınırsız
    interval: 'month',
    stripePriceId: 'price_1TRcpd2Nx5ehm1a8sEDl21Tq',
  },
};

export type PlanKey = keyof typeof PLANS;
