import { ImageResponse } from 'next/og';

export const alt = 'DQFB Business — Controle DQFB';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#fcf8f7',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '80px',
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            color: '#881D28',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: 60,
          }}
        >
          DQFB Business
        </div>
        <div
          style={{
            color: '#680114',
            fontSize: 140,
            fontWeight: 900,
            lineHeight: 1.05,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span>Controle</span>
          <span style={{ fontStyle: 'italic' }}>DQFB</span>
        </div>
        <div
          style={{
            marginTop: 'auto',
            color: '#574141',
            fontSize: 28,
            maxWidth: 900,
            lineHeight: 1.5,
          }}
        >
          Estratégia, gestão, comunicação e ferramentas integradas em um ecossistema de alta performance.
        </div>
      </div>
    ),
    { ...size },
  );
}
