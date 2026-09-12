"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/checkout/fields";
import DeliveryForm from "@/components/checkout/DeliveryForm";
import PaymentForm from "@/components/checkout/PaymentForm";
import ReviewStep from "@/components/checkout/ReviewStep";
import CheckoutSummary from "@/components/checkout/CheckoutSummary";
import OrderSuccess, { type PlacedOrder } from "@/components/checkout/OrderSuccess";
import { EMPTY_CHECKOUT, type CheckoutData } from "@/components/checkout/types";
import { DELIVERY_OPTIONS, useCart } from "@/lib/cart";
import {
  expiryOk,
  hasErrors,
  isCvc,
  isEmail,
  isPhone,
  isUKPostcode,
  luhnOk,
  type FieldErrors,
} from "@/lib/validation";

function validateDelivery(d: CheckoutData): FieldErrors {
  return {
    email: !d.email.trim() ? "Enter your email address" : !isEmail(d.email) ? "Enter a valid email address" : undefined,
    phone: !d.phone.trim() ? "Enter your mobile number" : !isPhone(d.phone) ? "Enter a valid UK phone number" : undefined,
    firstName: !d.firstName.trim() ? "Enter your first name" : undefined,
    lastName: !d.lastName.trim() ? "Enter your last name" : undefined,
    address1: !d.address1.trim() ? "Enter your address" : undefined,
    town: !d.town.trim() ? "Enter your town or city" : undefined,
    postcode: !d.postcode.trim() ? "Enter your postcode" : !isUKPostcode(d.postcode) ? "Enter a valid UK postcode, e.g. E2 8DP" : undefined,
  };
}

function validatePayment(d: CheckoutData): FieldErrors {
  if (d.payMethod !== "card") return {};
  return {
    cardName: !d.cardName.trim() ? "Enter the name on the card" : undefined,
    cardNumber: !d.cardNumber.trim()
      ? "Enter your card number"
      : !luhnOk(d.cardNumber)
        ? "This card number doesn't look right — check and try again"
        : undefined,
    expiry: !d.expiry.trim() ? "Enter the expiry date" : !expiryOk(d.expiry) ? "Enter a valid future date (MM/YY)" : undefined,
    cvc: !d.cvc.trim() ? "Enter the security code" : !isCvc(d.cvc) ? "3–4 digits, on the back of your card" : undefined,
  };
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
    />
  );
}

export default function CheckoutPage() {
  const { lines, total, itemCount, setDelivery, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<CheckoutData>(EMPTY_CHECKOUT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = (p: Partial<CheckoutData>) => {
    if (p.delivery) setDelivery(p.delivery);
    setData((d) => ({ ...d, ...p }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(p)) delete next[k];
      return next;
    });
  };

  const scrollTop = () => topRef.current?.scrollIntoView({ block: "start" });

  const goNext = () => {
    const errs = step === 1 ? validateDelivery(data) : validatePayment(data);
    setErrors(errs);
    if (hasErrors(errs)) {
      scrollTop();
      return;
    }
    setPlaceError(null);
    setStep((s) => Math.min(3, s + 1));
    scrollTop();
  };

  const placeOrder = () => {
    setPlacing(true);
    setPlaceError(null);
    timer.current = setTimeout(() => {
      const digits = data.cardNumber.replace(/\D/g, "");
      if (data.payMethod === "card" && digits.endsWith("0002")) {
        setPlacing(false);
        setPlaceError(
          "Your card was declined (code 51 — insufficient funds). No money has been taken. Check your details or try a different card."
        );
        scrollTop();
        return;
      }
      const number = `VL-${String(Date.now()).slice(-6)}`;
      const deliveryLabel = DELIVERY_OPTIONS.find((d) => d.id === data.delivery)?.label ?? "Standard delivery";
      setOrder({
        number,
        email: data.email,
        total,
        itemCount,
        deliveryLabel,
      });
      clearCart();
      setPlacing(false);
      scrollTop();
    }, 1800);
  };

  return (
    <div className="flex min-h-full flex-col bg-white text-zinc-900">
      <Header />
      <main className="flex-1 bg-zinc-50">
        <div ref={topRef} className="mx-auto max-w-7xl scroll-mt-4 px-4 py-6 sm:px-6">
          <nav aria-label="Breadcrumb" className="mb-4 text-[12.5px] text-zinc-500">
            <ol className="flex items-center gap-1.5">
              <li><Link href="/" className="hover:text-zinc-950 hover:underline">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/cart" className="hover:text-zinc-950 hover:underline">Basket</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-semibold text-zinc-900">Checkout</li>
            </ol>
          </nav>

          {order ? (
            <OrderSuccess order={order} />
          ) : lines.length === 0 ? (
            <div className="mx-auto max-w-md rounded-sm border border-zinc-200 bg-white px-6 py-14 text-center">
              <h1 className="text-[22px] font-bold tracking-tight text-zinc-950">Your basket is empty</h1>
              <p className="mt-2 text-[14px] text-zinc-600">
                There&apos;s nothing to check out yet. Add some tech first.
              </p>
              <div className="mt-6">
                <Link href="/products">
                  <Button size="lg" className="w-full">Browse laptops</Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-1 flex items-center gap-2">
                <h1 className="text-[26px] font-bold tracking-tight text-zinc-950 sm:text-[30px]">Checkout</h1>
                <span aria-hidden="true" className="text-[15px] text-zinc-400">🔒</span>
              </div>
              <p className="mb-5 text-[13px] text-zinc-500">Secure 256-bit encrypted checkout · Demo — no real payment is taken</p>

              <div className="mb-6 max-w-2xl">
                <Stepper step={step} />
              </div>

              {placeError && (
                <div role="alert" className="mb-5 max-w-3xl rounded-sm border border-[#b3261e] bg-red-50 px-4 py-3.5">
                  <p className="text-[14px] font-bold text-[#8f1d17]">Payment failed</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-zinc-800">{placeError}</p>
                </div>
              )}

              <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
                <div className="min-w-0 rounded-sm border border-zinc-200 bg-white px-4 py-5 sm:px-6">
                  {step === 1 && <DeliveryForm data={data} errors={errors} onChange={patch} />}
                  {step === 2 && <PaymentForm data={data} errors={errors} onChange={patch} />}
                  {step === 3 && <ReviewStep data={data} onEdit={(s) => { setStep(s); scrollTop(); }} />}

                  <div className="mt-6 flex flex-col-reverse gap-2.5 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-between">
                    {step > 1 ? (
                      <Button variant="outline" onClick={() => { setStep((s) => s - 1); scrollTop(); }} disabled={placing}>
                        ← Back
                      </Button>
                    ) : (
                      <Link href="/cart" className="inline-flex h-11 items-center justify-center rounded-sm border border-zinc-300 px-5 text-[14px] font-semibold hover:border-zinc-950 sm:w-auto">
                        ← Back to basket
                      </Link>
                    )}
                    {step < 3 ? (
                      <Button onClick={goNext} className="sm:min-w-44">
                        Continue to {step === 1 ? "payment" : "review"}
                      </Button>
                    ) : (
                      <Button onClick={placeOrder} disabled={placing} className="sm:min-w-56">
                        {placing ? (
                          <span className="flex items-center gap-2"><Spinner /> Processing payment…</span>
                        ) : (
                          "Place order"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <CheckoutSummary />
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
