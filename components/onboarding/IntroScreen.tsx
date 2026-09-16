"use client";

export function IntroScreen({
  fragmentCount, onNext, onBack,
}: { fragmentCount: number; onNext: () => void; onBack: () => void }) {
  return (
    <div className="onb">
      <button className="onb-back-btn" onClick={onBack} aria-label="Volver">←</button>
      <div />
      <div className="onb-mid">
        <div className="logo">
          <span className="logo-bold">Tono</span>
          <span className="logo-light">cromía</span>
        </div>
        <p>
          Este ejercicio consta de {fragmentCount} fragmentos musicales. Al escuchar cada uno, podrás asociar
          libremente colores, texturas y emociones según lo que te haga sentir.
        </p>
        <p style={{ marginTop: 14 }}>
          No existen respuestas correctas ni incorrectas. Dejá que tu intuición elija por vos: escuchá lo que tu
          cuerpo ya sabe.
        </p>
      </div>
      <button className="onb-btn accent" onClick={onNext}>Empezar</button>
    </div>
  );
}
