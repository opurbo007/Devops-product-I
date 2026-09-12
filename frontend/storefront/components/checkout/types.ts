import type { DeliveryId } from "@/lib/cart";

export type PayMethod = "card" | "paypal" | "klarna";

export type CheckoutData = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  town: string;
  county: string;
  postcode: string;
  delivery: DeliveryId;
  payMethod: PayMethod;
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
};

export const EMPTY_CHECKOUT: CheckoutData = {
  email: "",
  phone: "",
  firstName: "",
  lastName: "",
  address1: "",
  address2: "",
  town: "",
  county: "",
  postcode: "",
  delivery: "standard",
  payMethod: "card",
  cardName: "",
  cardNumber: "",
  expiry: "",
  cvc: "",
};
