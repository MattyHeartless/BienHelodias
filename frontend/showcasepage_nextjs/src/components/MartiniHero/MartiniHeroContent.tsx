"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import { MartiniBeamsBackground } from "./MartiniBeamsBackground";

const indicators = [
  { value: "12k+", label: "pedidos" },
  { value: "85+", label: "tiendas" },
  { value: "14", label: "municipios" },
  { value: "220+", label: "repartidores" },
];

const howSteps = ["Afíliate", "Configura", "Vende", "Entrega", "Crece"];

const ecosystemApps = [
  { src: "/scene/eco_tienda.png", alt: "Sitio de compra Bien Helodias", label: "Sitio de compra" },
  { src: "/scene/eco_admin.png", alt: "Administrador Bien Helodias", label: "Administrador" },
  { src: "/scene/eco_envio.png", alt: "Repartidor Bien Helodias", label: "Repartidor" },
];

const whatsappPhone = "523318791893";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function handleAffiliateSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const business = getFormValue(formData, "business");
  const city = getFormValue(formData, "city");
  const contact = getFormValue(formData, "contact");
  const operation = getFormValue(formData, "operation");

  const message = [
    "Hola Bien Helodias, quiero iniciar mi afiliación.",
    "",
    `Negocio: ${business || "No especificado"}`,
    `Ciudad: ${city || "No especificada"}`,
    `Contacto: ${contact || "No especificado"}`,
    `Operación actual: ${operation || "No especificada"}`,
  ].join("\n");

  window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function handleAffiliateScroll() {
  window.dispatchEvent(new CustomEvent("martini:scroll-to-affiliate"));
}

export function MartiniHeroContent() {
  return (
    <div className="martini-content">
      <div className="hero-overlay">
        <MartiniBeamsBackground
          className="martini-beams--overlay"
          beamWidth={1.5}
          beamHeight={14}
          beamNumber={13}
          lightColor="#d2fd6e"
          speed={2}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={0}
        />
        <div className="hero-brand-seal" aria-label="Bien Helodias">
          <Image
            src="/brand/bh-seal.png"
            alt="Bien Helodias"
            width={470}
            height={442}
            priority
          />
        </div>
        <h2>Convierte tu licorería en una operación digital lista para vender más.</h2>
        <span>Desliza para que conozcas las Bien Helodias</span>
      </div>

      <div className="hero-logo">
        <span>Bien Helodias</span>
      </div>

      <section className="martini-scene martini-scene--main" aria-label="Claim principal">
        <h1 className="hero-main-copy">Vende, organiza y entrega sin perder el ritmo</h1>
      </section>

      <section className="martini-scene martini-scene--operation" aria-label="Operación">
        <div className="operation-copy">
          <p className="scene-kicker">Operación real</p>
          <h2>Operación real, no promesas</h2>
        </div>
        <div className="operation-indicators">
          {indicators.map((indicator) => (
            <article className="operation-indicator" key={indicator.label}>
              <strong>{indicator.value}</strong>
              <span>{indicator.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="martini-scene martini-scene--platform" aria-label="Plataforma">
        <div className="platform-copy">
          <p className="scene-kicker">Plataforma</p>
          <h2>Menos explicación, más señales vivas</h2>
        </div>
        <div className="platform-visuals">
          <div className="platform-card platform-drinks">
            <Image src="/scene/beerbag.png" alt="Bebidas dentro de la plataforma" width={500} height={500} />
          </div>
          <div className="platform-card platform-stonks">
            <Image src="/scene/business.png" alt="Administración del negocio en la plataforma" width={500} height={500} />
          </div>
          <div className="platform-card platform-pin">
            <Image src="/scene/route.png" alt="Seguimiento visible del pedido" width={500} height={500} />
          </div>
        </div>
      </section>

      <section className="martini-scene martini-scene--how" aria-label="Cómo funciona">
        <p className="how-title">CÓMO FUNCIONA</p>
        <div className="how-steps">
          {howSteps.map((step, index) => (
            <article className="how-step" key={step}>
              <span>{`0${index + 1}`}</span>
              <strong>{step}</strong>
            </article>
          ))}
        </div>
        <h2 className="how-reinforce-copy">Afíliate. Configura. Vende. Entrega.</h2>
      </section>

      <section className="martini-scene martini-scene--ecosystem" aria-label="Ecosistema">
        <div className="ecosystem-copy">
          <p className="scene-kicker">Ecosistema</p>
          <h2>Tres superficies. Un solo pulso.</h2>
          <span>Todo conectado, sin cambiar de ritmo.</span>
        </div>
        <div className="ecosystem-apps">
          {ecosystemApps.map((app) => (
            <article className="ecosystem-app" key={app.label}>
              <Image src={app.src} alt={app.alt} width={700} height={700} />
              <p>{app.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="martini-scene martini-scene--affiliate" aria-label="Afiliación">
        <h2 className="affiliate-title">
          <span className="affiliate-title__plain">Afíliate a</span>
          <span className="affiliate-title__brand">Bien Helodias</span>
        </h2>
        <form className="affiliate-form-panel" onSubmit={handleAffiliateSubmit}>
          <label className="affiliate-field">
            <span>Negocio</span>
            <input name="business" type="text" placeholder="Nombre de tu licorería" />
          </label>
          <label className="affiliate-field">
            <span>Ciudad</span>
            <input name="city" type="text" placeholder="Municipio o zona" />
          </label>
          <label className="affiliate-field">
            <span>Contacto</span>
            <input name="contact" type="tel" placeholder="Teléfono o WhatsApp" />
          </label>
          <label className="affiliate-field">
            <span>Operación actual</span>
            <textarea name="operation" rows={2} placeholder="Pedidos, cobertura y retos actuales." />
          </label>
          <button className="affiliate-submit" type="submit">
            <span>Enviar solicitud</span>
            <span className="action-icon" aria-hidden="true">→</span>
          </button>
        </form>
      </section>

      <section className="martini-scene martini-scene--final" aria-label="CTA final">
        <div className="final-cta">
          <p className="scene-kicker">Cierre</p>
          <h2>Tu licorería puede operar como red desde el primer pedido.</h2>
          <button type="button" onClick={handleAffiliateScroll}>
            <span>Iniciar afiliación</span>
            <span className="action-icon" aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}
