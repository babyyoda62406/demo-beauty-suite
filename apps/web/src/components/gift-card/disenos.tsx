/* eslint-disable @next/next/no-img-element */
'use client';

import * as React from 'react';

/**
 * Marcado de las siete tarjetas, tal cual se maquetaron.
 *
 * Traducido del prototipo (retos/tarjetas-spa/index.html) con un conversor: lo
 * unico que cambia son los atributos que JSX escribe distinto y la ruta de las
 * imagenes, que aqui se sirven desde /public. El diseno no se ha tocado.
 *
 * Los huecos que rellena la aplicacion (Para, De y el codigo QR) se marcan en el
 * HTML y los sustituye TarjetaRegalo; ver GiftCard.tsx.
 *
 * Las imagenes van con img a pelo y no con next/image porque son decoracion
 * posicionada con el CSS del prototipo: next/image envuelve cada una en su
 * propio contenedor y romperia ese posicionado.
 */

/** Simbolos SVG compartidos por todas las tarjetas. Se pintan una vez. */
export function SimbolosTarjeta(): React.JSX.Element {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
    

    
        <symbol id="lotus-mark" viewBox="0 0 48 26">
          <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M24 1.5c-3.2 4.2-3.2 12.8 0 17.5 3.2-4.7 3.2-13.3 0-17.5Z" />
            <path d="M14 5c-.6 6.3 3 11.9 10 14 -.8-6.2-4.2-11.4-10-14Z" />
            <path d="M34 5c.6 6.3-3 11.9-10 14 .8-6.2 4.2-11.4 10-14Z" />
            <path d="M3.5 12.5c2.3 6.4 10.5 9.4 20.5 6.5-5-4.6-13-7.2-20.5-6.5Z" />
            <path d="M44.5 12.5c-2.3 6.4-10.5 9.4-20.5 6.5 5-4.6 13-7.2 20.5-6.5Z" />
          </g>
        </symbol>

    
        <symbol id="spark" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 0c1.1 6.9 4 9.8 12 12-8 2.2-10.9 5.1-12 12-1.1-6.9-4-9.8-12-12C8 9.8 10.9 6.9 12 0Z" />
        </symbol>

    
        <symbol id="logo-lotus" viewBox="0 0 64 76">
          <use href="#spark" x="27.5" y="0" width="9" height="9" />
          <circle cx="32" cy="44" r="26" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <use href="#lotus-mark" x="10" y="32" width="44" height="23.8" />
        </symbol>

    
        <symbol id="heart" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 21c-6-4.9-10-8.5-10-13C2 4.7 4.7 2 8 2c1.9 0 3.3.9 4 2.2C12.7 2.9 14.1 2 16 2c3.3 0 6 2.7 6 6 0 4.5-4 8.1-10 13Z" />
        </symbol>

    
        <symbol id="arrow-curl" viewBox="0 0 32 40">
          <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M26 37C13 30 9 19 13 4" />
            <path d="M13 4 6.5 11M13 4l8.5 5.5" />
          </g>
        </symbol>

    
        <symbol id="flourish" viewBox="0 0 160 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M4 13h48c8 0 12-5.5 8-8.5s-10 .8-6 6.5 15 7.5 24 1.5" />
            <path d="M156 13h-48c-8 0-12-5.5-8-8.5s10 .8 6 6.5-15 7.5-24 1.5" />
          </g>
          <use href="#spark" x="74" y="6" width="12" height="12" />
        </symbol>

    
        <symbol id="bottle" viewBox="0 0 24 40">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <rect x="8.6" y="1.5" width="6.8" height="10" rx="1.4" />
            <path d="M9.6 11.5v3h4.8v-3" />
            <rect x="4" y="14.5" width="16" height="23.5" rx="4.5" />
          </g>
          <use href="#heart" x="8" y="21" width="8" height="8" />
        </symbol>

    
        <symbol id="leafline" viewBox="0 0 120 160">
          <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 154C46 116 66 76 94 22" />
            <path d="M46 114C32 108 20 112 12 124C26 128 40 124 46 114Z" />
            <path d="M52 100C54 84 48 72 36 64C34 80 40 92 52 100Z" />
            <path d="M62 82C48 74 36 76 26 86C40 92 54 90 62 82Z" />
            <path d="M68 68C72 52 68 40 56 32C52 48 58 60 68 68Z" />
            <path d="M78 48C64 42 52 44 44 54C58 60 72 56 78 48Z" />
            <path d="M84 36C90 22 88 10 78 2C72 16 76 28 84 36Z" />
          </g>
        </symbol>

    
        <symbol id="arc" viewBox="0 0 400 120" preserveAspectRatio="none">
          <path fill="none" stroke="currentColor" strokeWidth="1.6" d="M0 96C104 22 260 118 400 30" />
        </symbol>

    
    
        <symbol id="wave-a" viewBox="0 0 800 240" preserveAspectRatio="none">
          <path d="M0 118C140 42 262 196 420 128S700 62 800 108V240H0Z" />
        </symbol>
        <symbol id="wave-b" viewBox="0 0 800 240" preserveAspectRatio="none">
          <path d="M0 168C180 92 330 228 520 150S724 122 800 158V240H0Z" />
        </symbol>
        <symbol id="wave-c" viewBox="0 0 800 240" preserveAspectRatio="none">
          <path d="M0 84C120 150 300 40 470 96S680 176 800 104V240H0Z" />
        </symbol>
      </defs>
    </svg>
  );
}

/** Lo que la aplicación mete en cada tarjeta. */
export interface Huecos {
  para: React.ReactNode;
  de: React.ReactNode;
  qr: React.ReactNode;
}

export const DISENOS = {
  d1: ({ para, de, qr }: Huecos) => (
    <>
    <div className="face front">
              <img className="deco d1-wave-a" src="/tarjeta-regalo/img/wave-silk-2.png" alt="" />
              <img className="deco d1-wave-b" src="/tarjeta-regalo/img/wave-silk-1.png" alt="" />
              <img className="deco d1-wave-c" src="/tarjeta-regalo/img/wave-silk-3.png" alt="" />
              <img className="deco d1-hand" src="/tarjeta-regalo/img/hand-burgundy.png" alt="" />
              <div className="content">
                <svg className="logo" viewBox="0 0 64 76"><use href="#logo-lotus" /></svg>
                <p className="kicker">Tarjeta Regalo</p>
                <h2 className="title-serif">Spa de Uñas</h2>
                <div className="divider"><svg viewBox="0 0 24 24"><use href="#spark" /></svg></div>
                <p className="tagline">Regala un momento de belleza y cuidado</p>
              </div>
            </div>
            <div className="face back">
              <img className="deco d1b-wave-a" src="/tarjeta-regalo/img/wave-silk-2.png" alt="" />
              <img className="deco d1b-wave-b" src="/tarjeta-regalo/img/wave-silk-1.png" alt="" />
              <img className="deco d1b-gift" src="/tarjeta-regalo/img/gift-box.png" alt="" />
              <img className="deco d1b-handline" src="/tarjeta-regalo/img/logo-hand-oval.png" alt="" />
              <svg className="deco d1b-spark" viewBox="0 0 24 24"><use href="#spark" /></svg>
              <div className="back-cols">
                <div className="qr-block">
                  <div className="qr-panel">
                    {qr}
                    <span className="qr-badge"><svg viewBox="0 0 48 26"><use href="#lotus-mark" /></svg></span>
                  </div>
                  <p className="scan"><svg className="arrow" viewBox="0 0 32 40"><use href="#arrow-curl" /></svg>Escanea aquí</p>
                </div>
                <div className="vline"><svg viewBox="0 0 24 24"><use href="#spark" /></svg></div>
                <div className="fields">
                  <p className="field"><span>Para:</span><i>{para}</i></p>
                  <p className="field"><span>De:</span><i>{de}</i></p>
                </div>
              </div>
            </div>
    </>
  ),
  d2: ({ para, de, qr }: Huecos) => (
    <>
    <div className="face front">
              <img className="deco d2-wave-a" src="/tarjeta-regalo/img/wave-silk-4.png" alt="" />
              <img className="deco d2-dust" src="/tarjeta-regalo/img/gold-dust.png" alt="" />
              <img className="deco d2-wave-b" src="/tarjeta-regalo/img/wave-silk-4.png" alt="" />
              <img className="deco d2-hand" src="/tarjeta-regalo/img/hand-glitter.png" alt="" />
              <div className="content">
                <svg className="logo" viewBox="0 0 64 76"><use href="#logo-lotus" /></svg>
                <p className="kicker">Tarjeta Regalo</p>
                <h2 className="title-serif">Spa de Uñas</h2>
                <div className="divider"><svg viewBox="0 0 24 24"><use href="#spark" /></svg></div>
                <p className="tagline">Regala un momento de belleza y cuidado</p>
              </div>
            </div>
            <div className="face back">
              <img className="deco d2b-wave-a" src="/tarjeta-regalo/img/wave-silk-4.png" alt="" />
              <img className="deco d2b-wave-b" src="/tarjeta-regalo/img/wave-silk-4.png" alt="" />
              <img className="deco d2b-branch" src="/tarjeta-regalo/img/branch-gold.png" alt="" />
              <svg className="deco d2b-bottle" viewBox="0 0 24 40"><use href="#bottle" /></svg>
              <svg className="deco d2b-spark" viewBox="0 0 24 24"><use href="#spark" /></svg>
              <div className="back-cols">
                <div className="qr-block">
                  <div className="qr-panel">
                    {qr}
                    <span className="qr-badge"><svg viewBox="0 0 48 26"><use href="#lotus-mark" /></svg></span>
                  </div>
                  <p className="scan"><svg className="arrow" viewBox="0 0 32 40"><use href="#arrow-curl" /></svg>Escanea aquí</p>
                </div>
                <div className="vline"><svg viewBox="0 0 24 24"><use href="#spark" /></svg></div>
                <div className="fields">
                  <p className="field"><span>Para:</span><i>{para}</i></p>
                  <p className="field"><span>De:</span><i>{de}</i></p>
                </div>
              </div>
            </div>
    </>
  ),
  d3: ({ para, de, qr }: Huecos) => (
    <>
    <div className="face front">
              <img className="deco d3-agate-a" src="/tarjeta-regalo/img/wave-silk-2.png" alt="" />
              <img className="deco d3-agate-b" src="/tarjeta-regalo/img/wave-silk-1.png" alt="" />
              <img className="deco d3-dust-a" src="/tarjeta-regalo/img/gold-dust.png" alt="" />
              <img className="deco d3-dust-b" src="/tarjeta-regalo/img/gold-dust.png" alt="" />
              <div className="content">
                <img className="lotus-img" src="/tarjeta-regalo/img/lotus-gold-fill.png" alt="" />
                <p className="kicker">Tarjeta</p>
                <h2 className="title-serif">Regalo</h2>
                <p className="title-script">Spa de Uñas</p>
                <svg className="flourish" viewBox="0 0 160 24"><use href="#flourish" /></svg>
              </div>
            </div>
            <div className="face back">
              <img className="deco d3-agate-a" src="/tarjeta-regalo/img/wave-silk-2.png" alt="" />
              <img className="deco d3-agate-b" src="/tarjeta-regalo/img/wave-silk-1.png" alt="" />
              <div className="back-cols">
                <div className="d3b-row">
                  <div className="d3-qrwrap">
                    <img className="frame" src="/tarjeta-regalo/img/frame-ticket.png" alt="" />
                    <div className="qr-chip">
                      {qr}
                      <span className="qr-badge"><svg viewBox="0 0 48 26"><use href="#lotus-mark" /></svg></span>
                    </div>
                  </div>
                  <div className="d3b-right">
                    <p className="d3b-scan">Escanea aquí
                      <svg className="heart" viewBox="0 0 24 24"><use href="#heart" /></svg>
                      <svg className="arrow" viewBox="0 0 32 40"><use href="#arrow-curl" /></svg>
                    </p>
                    <div className="fields">
                      <p className="field"><span>Para:</span><i>{para}</i></p>
                      <p className="field"><span>De:</span><i>{de}</i></p>
                    </div>
                  </div>
                </div>
                <div className="d3b-foot">
                  <svg className="flourish" viewBox="0 0 160 24"><use href="#flourish" /></svg>
                  <img className="bottle-img" src="/tarjeta-regalo/img/polish-bottle.png" alt="" />
                  <svg className="flourish mirror" viewBox="0 0 160 24"><use href="#flourish" /></svg>
                </div>
              </div>
            </div>
    </>
  ),
  d4: ({ para, de, qr }: Huecos) => (
    <>
    <div className="face front">
              <img className="deco d4-branch-a" src="/tarjeta-regalo/img/branch-green.png" alt="" />
              <img className="deco d4-dust" src="/tarjeta-regalo/img/gold-dust.png" alt="" />
              <svg className="deco d4-arc" viewBox="0 0 400 120" preserveAspectRatio="none"><use href="#arc" /></svg>
              <svg className="deco d4-leafline" viewBox="0 0 120 160"><use href="#leafline" /></svg>
              <span className="deco d4-speck-a"></span>
              <span className="deco d4-speck-b"></span>
              <div className="content">
                <img className="logo-oval" src="/tarjeta-regalo/img/logo-hand-oval-green.png" alt="" />
                <p className="kicker">Tarjeta Regalo</p>
                <div className="divider"><svg viewBox="0 0 48 26"><use href="#lotus-mark" /></svg></div>
                <p className="title-script">Spa de Uñas</p>
              </div>
            </div>
            <div className="face back">
              <img className="deco d4b-branch-a" src="/tarjeta-regalo/img/branch-sage.png" alt="" />
              <img className="deco d4b-branch-b" src="/tarjeta-regalo/img/branch-pink.png" alt="" />
              <div className="back-cols">
                <svg className="d4b-lotus" viewBox="0 0 48 26"><use href="#lotus-mark" /></svg>
                <p className="d4b-scan">Escanea aquí</p>
                <div className="d4b-rule"><svg viewBox="0 0 24 24"><use href="#spark" /></svg></div>
                <div className="qr-panel">
                  {qr}
                  <span className="qr-badge"><svg viewBox="0 0 48 26"><use href="#lotus-mark" /></svg></span>
                </div>
                <div className="d4b-fields">
                  <p className="field"><span>Para:</span><b>{para}</b></p>
                  <p className="field"><span>De:</span><b>{de}</b></p>
                </div>
              </div>
            </div>
    </>
  ),
  d5: ({ para, de, qr }: Huecos) => (
    <>
    <div className="face front">
              <img className="deco d5-wash" src="/tarjeta-regalo/img/wave-wc-pink.png" alt="" />
              <svg className="deco d5-arc" viewBox="0 0 400 120" preserveAspectRatio="none"><use href="#arc" /></svg>
              <img className="deco d5-dust" src="/tarjeta-regalo/img/rose-dust.png" alt="" />
              <svg className="deco d5-leafline" viewBox="0 0 120 160"><use href="#leafline" /></svg>
              <img className="deco d5-hand" src="/tarjeta-regalo/img/hand-nude.png" alt="" />
              <div className="content">
                <svg className="bottle-top" viewBox="0 0 24 40"><use href="#bottle" /></svg>
                <p className="kicker">Tarjeta Regalo</p>
                <p className="title-script">Spa de Uñas</p>
                <div className="divider"><svg viewBox="0 0 24 24"><use href="#heart" /></svg></div>
              </div>
            </div>
            <div className="face back">
              <svg className="deco d5b-arc" viewBox="0 0 400 120" preserveAspectRatio="none"><use href="#arc" /></svg>
              <svg className="deco d5b-leafline" viewBox="0 0 120 160"><use href="#leafline" /></svg>
              <div className="back-cols">
                <div className="d5b-qrcol">
                  <svg className="d5b-heart" viewBox="0 0 24 24"><use href="#heart" /></svg>
                  <p className="d5b-scan">Escanea aquí</p>
                  <svg className="d5b-arrow" viewBox="0 0 32 40"><use href="#arrow-curl" /></svg>
                  <div className="qr-panel">
                    {qr}
                    <span className="qr-badge"><svg viewBox="0 0 48 26"><use href="#lotus-mark" /></svg></span>
                  </div>
                </div>
                <div className="fields">
                  <p className="field"><span>Para:</span><i>{para}</i></p>
                  <p className="field"><span>De:</span><i>{de}</i></p>
                </div>
              </div>
            </div>
    </>
  ),
  d6: ({ para, de, qr }: Huecos) => (
    <>
    <div className="face front">
              <img className="deco d6-blossom" src="/tarjeta-regalo/img/flower-blossom.png" alt="" />
              <img className="deco d6-petal-a" src="/tarjeta-regalo/img/petal-pink.png" alt="" />
              <img className="deco d6-petal-b" src="/tarjeta-regalo/img/petal-blush.png" alt="" />
              <div className="deco waves">
                <svg viewBox="0 0 800 240" preserveAspectRatio="none">
                  <use href="#wave-a" fill="#f2a9c9" opacity="0.5" />
                  <use href="#wave-c" fill="#e779ab" opacity="0.55" />
                  <use href="#wave-b" fill="#c1417f" opacity="0.8" />
                </svg>
              </div>
              <img className="deco d6-dust" src="/tarjeta-regalo/img/gold-dust.png" alt="" />
              <img className="deco d6-hand" src="/tarjeta-regalo/img/hand-mixed.png" alt="" />
              <div className="content">
                <svg className="logo" viewBox="0 0 64 76"><use href="#logo-lotus" /></svg>
                <p className="kicker">Tarjeta Regalo</p>
                <div className="divider"><svg viewBox="0 0 24 24"><use href="#spark" /></svg></div>
                <h2 className="title-serif">Spa de Uñas</h2>
              </div>
            </div>
            <div className="face back">
              <div className="deco waves top">
                <svg viewBox="0 0 800 240" preserveAspectRatio="none">
                  <use href="#wave-a" fill="#f2a9c9" opacity="0.45" />
                  <use href="#wave-b" fill="#d95d99" opacity="0.55" />
                </svg>
              </div>
              <div className="deco waves">
                <svg viewBox="0 0 800 240" preserveAspectRatio="none">
                  <use href="#wave-a" fill="#f2a9c9" opacity="0.55" />
                  <use href="#wave-b" fill="#c1417f" opacity="0.7" />
                  <use href="#wave-c" fill="#8e4a9e" opacity="0.65" />
                </svg>
              </div>
              <img className="deco d6b-branch" src="/tarjeta-regalo/img/branch-pink.png" alt="" />
              <img className="deco d6b-petal" src="/tarjeta-regalo/img/petal-pink.png" alt="" />
              <div className="back-cols">
                <div className="qr-block">
                  <div className="qr-panel">
                    {qr}
                    <span className="qr-badge"><svg viewBox="0 0 48 26"><use href="#lotus-mark" /></svg></span>
                  </div>
                  <p className="scan"><svg className="arrow" viewBox="0 0 32 40"><use href="#arrow-curl" /></svg>Escanea aquí</p>
                </div>
                <div className="vline"><svg viewBox="0 0 24 24"><use href="#spark" /></svg></div>
                <div className="fields">
                  <p className="field"><span>Para:</span><i>{para}</i></p>
                  <p className="field"><span>De:</span><i>{de}</i></p>
                </div>
              </div>
            </div>
    </>
  ),
  d7: ({ para, de, qr }: Huecos) => (
    <>
    <div className="face front">
              <img className="deco d7-wash" src="/tarjeta-regalo/img/wave-wc-pink.png" alt="" />
              <svg className="deco d7-arc-a" viewBox="0 0 400 120" preserveAspectRatio="none"><use href="#arc" /></svg>
              <div className="deco waves">
                <svg viewBox="0 0 800 240" preserveAspectRatio="none">
                  <use href="#wave-a" fill="#f6bcd4" opacity="0.6" />
                  <use href="#wave-c" fill="#df8cb4" opacity="0.55" />
                  <use href="#wave-b" fill="#a12a63" opacity="0.75" />
                </svg>
              </div>
              <svg className="deco d7-thread" viewBox="0 0 400 120" preserveAspectRatio="none"><use href="#arc" /></svg>
              <img className="deco d7-flower" src="/tarjeta-regalo/img/flower-cosmos.png" alt="" />
              <img className="deco d7-hand" src="/tarjeta-regalo/img/hand-mixed.png" alt="" />
              <div className="content">
                <svg className="logo" viewBox="0 0 64 76"><use href="#logo-lotus" /></svg>
                <p className="kicker">Tarjeta Regalo</p>
                <h2 className="title-serif">Spa de Uñas</h2>
                <div className="divider"><svg viewBox="0 0 24 24"><use href="#spark" /></svg></div>
                <p className="tagline">Regala un momento de belleza y cuidado</p>
              </div>
            </div>
            <div className="face back">
              <div className="deco waves top">
                <svg viewBox="0 0 800 240" preserveAspectRatio="none">
                  <use href="#wave-a" fill="#f6bcd4" opacity="0.6" />
                  <use href="#wave-b" fill="#a12a63" opacity="0.6" />
                </svg>
              </div>
              <div className="deco waves">
                <svg viewBox="0 0 800 240" preserveAspectRatio="none">
                  <use href="#wave-a" fill="#f6bcd4" opacity="0.55" />
                  <use href="#wave-b" fill="#c1417f" opacity="0.6" />
                  <use href="#wave-c" fill="#7d3f88" opacity="0.8" />
                </svg>
              </div>
              <img className="deco d7b-branch" src="/tarjeta-regalo/img/branch-pink.png" alt="" />
              <div className="back-cols">
                <div className="qr-block">
                  <div className="qr-panel">
                    {qr}
                    <span className="qr-badge"><svg viewBox="0 0 48 26"><use href="#lotus-mark" /></svg></span>
                  </div>
                  <p className="scan"><svg className="arrow" viewBox="0 0 32 40"><use href="#arrow-curl" /></svg>Escanea aquí</p>
                </div>
                <div className="vline"><svg viewBox="0 0 24 24"><use href="#spark" /></svg></div>
                <div className="fields">
                  <p className="field"><span>Para:</span><i>{para}</i></p>
                  <p className="field"><span>De:</span><i>{de}</i></p>
                </div>
              </div>
            </div>
    </>
  ),
} as const;

export type DisenoId = keyof typeof DISENOS;

/** Nombre de cada diseno, para poder elegirlo. */
export const NOMBRES_DISENO: Record<DisenoId, string> = {
  d1: 'Seda y Vino',
  d2: 'Noir Mármol',
  d3: 'Púrpura Satín',
  d4: 'Boho Acuarela',
  d5: 'Rose Gold',
  d6: 'Ondas Rosa',
  d7: 'Ondas Alba',
};
