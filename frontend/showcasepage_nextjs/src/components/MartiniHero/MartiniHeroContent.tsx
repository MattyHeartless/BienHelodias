"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import { MartiniBeamsBackground } from "./MartiniBeamsBackground";

const indicators = [
  { value: "12k+", label: "pedidos servidos" },
  { value: "85+", label: "tiendas aliadas" },
  { value: "14", label: "municipios cubiertos" },
  { value: "220+", label: "repartidores al tiro" },
];

const commissionPanels = [
  { label: "OLVIDATE" },
  { label: "DEL" },
  { label: "33%", accent: true, detail: "Que cobran las plataformas de comida" },
  { label: "Tu tienes los medios" },
  { label: "Nosotros te damos la tecnología" },
];

const howSteps = ["Afíliate", "Deja todo listo", "Vende", "Manda las frías", "Crece"];

const ecosystemApps = [
  { src: "/scene/eco_tienda.png", alt: "Sitio de compra de BienHelodias", label: "Tienda para pedir" },
  { src: "/scene/eco_admin.png", alt: "Administrador de BienHelodias", label: "Admin al tiro" },
  { src: "/scene/eco_envio.png", alt: "App de reparto de BienHelodias", label: "Reparto en corto" },
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
    "Hola BienHelodias, quiero afiliar mi licorería.",
    "",
    `Negocio: ${business || "No especificado"}`,
    `Zona: ${city || "No especificada"}`,
    `Contacto: ${contact || "No especificado"}`,
    `Cómo vendo hoy: ${operation || "No especificada"}`,
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
        <div className="hero-brand-seal" aria-label="BienHelodias">
          <Image
            src="/brand/bh-seal.png"
            alt="BienHelodias"
            width={470}
            height={442}
            priority
          />
        </div>
        <h2>Pon tu licorería al tiro para vender más, coordinar mejor y entregar en corto.</h2>
        <span>Desliza y mira cómo se mueven las bien helodias</span>
      </div>

      <div className="hero-logo">
        <span>BienHelodias</span>
      </div>

      <section className="martini-scene martini-scene--main" aria-label="Claim principal">
        <h1 className="hero-main-copy">Vende, organiza y entrega las frías sin perder el ritmo</h1>
      </section>

      <section className="martini-scene martini-scene--operation" aria-label="Operación">
        <div className="operation-copy">
          <p className="scene-kicker">Al tiro en la calle</p>
          <h2>Pedidos reales, frías saliendo y todo bajo control</h2>
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

      <section className="martini-scene martini-scene--commission" aria-label="Olvidate del 33%">
        <div className="commission-stack" aria-hidden="true">
          {commissionPanels.map((panel, index) => {
            const hasFaultyTerminal = index === 3;
            const hasMatrixBackground = index === 4;

            return (
              <article
                className={`commission-panel${panel.accent ? " commission-panel--accent" : ""}${index === 0 ? " commission-panel--orange" : ""}${index === 1 ? " commission-panel--red" : ""}${index === 2 ? " commission-panel--black" : ""}${hasFaultyTerminal ? " commission-panel--simple" : ""}${hasMatrixBackground ? " commission-panel--matrix" : ""}`}
                key={panel.label}
                style={{ zIndex: index + 1 }}
              >
                {hasMatrixBackground ? (
                  <Image
                    className="commission-matrix-image"
                    src="/scene/commission-tab5-matrix-bg.png"
                    alt=""
                    fill
                    sizes="100vw"
                    priority={false}
                  />
                ) : null}
                <div className="commission-panel__content">
                  <strong className={panel.accent ? "commission-panel__flicker" : undefined}>
                    {panel.label}
                  </strong>
                  {panel.detail ? <span className="commission-panel__detail">{panel.detail}</span> : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="martini-scene martini-scene--platform" aria-label="Plataforma">
        <div className="platform-copy">
          <p className="scene-kicker">Todo conectado</p>
          <h2>Menos vueltas, más señales en vivo</h2>
        </div>
        <div className="platform-visuals">
          <div className="platform-card platform-drinks">
            <Image src="/scene/beerbag.png" alt="Bebidas listas para pedir en la plataforma" width={500} height={500} />
          </div>
          <div className="platform-card platform-stonks">
            <Image src="/scene/business.png" alt="Administración de la licorería en la plataforma" width={500} height={500} />
          </div>
          <div className="platform-card platform-pin">
            <Image src="/scene/route.png" alt="Seguimiento del pedido en camino" width={500} height={500} />
          </div>
        </div>
      </section>

      <section className="martini-scene martini-scene--how" aria-label="Cómo funciona">
        <p className="how-title">ASÍ SE ARMA</p>
        <div className="how-steps">
          {howSteps.map((step, index) => (
            <article className="how-step" key={step}>
              <span>{`0${index + 1}`}</span>
              <strong>{step}</strong>
            </article>
          ))}
        </div>
        <h2 className="how-reinforce-copy">Afíliate. Deja todo listo. Vende. Manda las frías.</h2>
      </section>

      <section className="martini-scene martini-scene--ecosystem" aria-label="Ecosistema">
        <div className="ecosystem-copy">
          <p className="scene-kicker">La jugada completa</p>
          <h2>Tres lados conectados. Un solo ritmo.</h2>
          <span>Tienda, admin y reparto jalando parejo.</span>
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
          <span className="affiliate-title__brand">BienHelodias</span>
        </h2>
        <form className="affiliate-form-panel" onSubmit={handleAffiliateSubmit}>
          <label className="affiliate-field">
            <span>Tu negocio</span>
            <input name="business" type="text" placeholder="Nombre de tu licorería" />
          </label>
          <label className="affiliate-field">
            <span>Zona</span>
            <input name="city" type="text" placeholder="Municipio o zona donde jalas" />
          </label>
          <label className="affiliate-field">
            <span>Contacto</span>
            <input name="contact" type="tel" placeholder="Teléfono o WhatsApp" />
          </label>
          <label className="affiliate-field">
            <span>Cómo vendes hoy</span>
            <textarea name="operation" rows={2} placeholder="Pedidos, cobertura y qué quieres mejorar." />
          </label>
          <button className="affiliate-submit" type="submit">
            <span>Va, quiero afiliarme</span>
            <span className="action-icon" aria-hidden="true">→</span>
          </button>
        </form>
      </section>

      <section className="martini-scene martini-scene--final" aria-label="CTA final">
        <div className="final-cta">
          <p className="scene-kicker">Listo para arrancar</p>
          <h2>Tu licorería puede vender, coordinar y entregar al tiro desde el primer pedido.</h2>
          <button type="button" onClick={handleAffiliateScroll}>
            <span>Afiliar mi licorería</span>
            <span className="action-icon" aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}
