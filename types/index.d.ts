// Type definitions for tappay-web-module

export interface TapPayConfig {
  appId: number;
  appKey: string;
  serverType?: 'sandbox' | 'production';
  sdkVersion?: string;
  sdkIntegrity?: string;
}

export interface CardFieldMounts {
  number: string | HTMLElement;
  expirationDate: string | HTMLElement;
  ccv: string | HTMLElement;
}

export interface CardOptions {
  fields: CardFieldMounts;
  styles?: Record<string, Record<string, string>>;
  isMaskCreditCardNumber?: boolean;
  maskRange?: { beginIndex: number; endIndex: number };
  placeholders?: Partial<Record<'number' | 'expirationDate' | 'ccv', string>>;
}

export interface CardPrimeResult {
  prime: string;
  card: {
    prime: string;
    lasttwo?: string;
    lastfour?: string;
    bincode?: string;
    funding?: number;
    type?: number;
    [k: string]: unknown;
  };
}

export class CardPayment {
  on(event: 'statuschange' | 'ready', handler: (payload: any) => void): () => void;
  mount(): Promise<this>;
  canGetPrime(): boolean;
  getStatus(): any;
  getPrime(): Promise<CardPrimeResult>;
}

export interface GooglePayOptions {
  merchantName: string;
  googleMerchantId?: string;
  allowedCardAuthMethods?: string[];
  allowedNetworks?: string[];
  allowedCountryCodes?: string[];
  emailRequired?: boolean;
  phoneNumberRequired?: boolean;
  shippingAddressRequired?: boolean;
  billingAddressRequired?: boolean;
  billingAddressFormat?: 'MIN' | 'FULL';
  allowPrepaidCards?: boolean;
  price?: string | number;
  currency?: string;
}

export class GooglePayment {
  readonly available: boolean;
  init(): Promise<boolean>;
  setPrice(price: string | number, currency?: string): Promise<void>;
  renderButton(cfg: {
    el: string | HTMLElement;
    color?: 'black' | 'white';
    type?: 'long' | 'short';
    onPrime: (prime: string, result: any) => void;
    onError?: (err: TapPayError) => void;
  }): Promise<void>;
  getPrime(): Promise<{ prime: string; result: any }>;
}

export class TapPayClient {
  constructor(config: TapPayConfig);
  appId: number;
  appKey: string;
  serverType: 'sandbox' | 'production';
  ready(opts?: { googlePay?: boolean }): Promise<any>;
  card(options?: CardOptions): CardPayment;
  googlePay(options: GooglePayOptions): GooglePayment;
}

export function createTapPay(config: TapPayConfig): TapPayClient;

export interface CheckoutOptions {
  theme?: 'light' | 'dark' | 'auto';
  mode?: 'inline' | 'modal';
  container?: string | HTMLElement;
  amount?: number;
  currency?: string;
  title?: string;
  payButtonText?: string;
  card?: boolean;
  googlePay?: Partial<GooglePayOptions> | false;
  onPrime?: (res: { method: 'card' | 'google-pay'; prime: string; card?: any; result?: any }) => void;
  onError?: (err: TapPayError) => void;
  onClose?: () => void;
}

export class Checkout {
  constructor(client: TapPayClient, opts?: CheckoutOptions);
  mount(): Promise<this>;
  setTheme(theme: 'light' | 'dark' | 'auto'): void;
  close(): void;
}

export class TapPayError extends Error {
  status?: number | string;
  code: string;
  cause?: unknown;
}

export function loadTapPaySDK(opts?: {
  version?: string;
  integrity?: string;
  googlePay?: boolean;
}): Promise<any>;

export const VERSION: string;
