"use client";

import { useActionState, useEffect, useState } from "react";
import { lagreMaalAction } from "@/app/maal/actions";
import type { Goal, MetrikkType } from "@/lib/types";
import type { ActionResultat } from "@/lib/actions";
import { SkjemaFelt } from "./skjema/SkjemaFelt";
import { SkjemaValg } from "./skjema/SkjemaValg";
import { SkjemaTekstFelt } from "./skjema/SkjemaTekstFelt";
import { LagreKnappAnimert } from "./skjema/LagreKnappAnimert";

type Modus = "manuell" | "metrikk" | "teller";

// Lever i mål-dialogen (MaalUtforsker eier <dialog>-elementet).
// Sporingsmodusen er KONTROLLERT fordi den veksler feltsettet:
//   manuell → målverdi + enhet (fremdrift logges for hånd)
//   metrikk → metrikk-valg + målverdi + retning (fremdrift avledes)
//   teller  → kilde-valg + antall (fremdrift telles live)
// I redigeringsmodus forhåndsutfylles feltene og et skjult id-felt får
// actionen til å oppdatere; eieren gir komponenten ny key per mål.
export function MaalSkjema({
  metrikkTyper,
  standardDato,
  rediger,
  onAvbryt,
  onLagret,
}: {
  metrikkTyper: MetrikkType[];
  standardDato: string;
  rediger?: Goal;
  onAvbryt: () => void;
  onLagret: () => void;
}) {
  const [resultat, handling] = useActionState<ActionResultat | undefined, FormData>(
    lagreMaalAction,
    undefined,
  );
  const verdier = resultat && !resultat.ok ? resultat.verdier : undefined;

  // Lukk dialogen etter vellykket lagring – med nok forsinkelse til at
  // lagre-animasjonen og kvitteringen rekker å vises.
  useEffect(() => {
    if (!resultat?.ok) return;
    const timer = setTimeout(onLagret, 1600);
    return () => clearTimeout(timer);
  }, [resultat, onLagret]);

  const [modus, setModus] = useState<Modus>(
    rediger?.metricKey
      ? "metrikk"
      : rediger?.countSource
        ? "teller"
        : "manuell",
  );

  // React 19 kjører native form.reset() etter HVER fullført action – også
  // feilede. Remount via ny key tvinger den kontrollerte modus-selecten
  // tilbake i synk med staten. («Adjust state during render»-mønsteret.)
  const [forrigeResultat, setForrigeResultat] = useState(resultat);
  const [nullstillNokkel, setNullstillNokkel] = useState(0);
  if (resultat !== forrigeResultat) {
    setForrigeResultat(resultat);
    setNullstillNokkel((nokkel) => nokkel + 1);
  }

  const maalverdiStandard =
    rediger?.targetValue != null
      ? String(rediger.targetValue).replace(".", ",")
      : undefined;
  // Goal.unit er avledet visningstekst for automatiske mål («nye land»,
  // metrikk-enheten) – den skal aldri forhåndsutfylle det MANUELLE
  // enhet-feltet ved modusbytte, ellers lagres visningsteksten som enhet.
  const redigerErManuell =
    rediger != null &&
    rediger.metricKey === null &&
    rediger.countSource === null;

  return (
    <form action={handling} className="p-4 sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          {rediger ? "Rediger mål" : "Nytt mål"}
        </h2>
        <button
          type="button"
          onClick={onAvbryt}
          className="text-xs text-ink-3 transition-colors hover:text-ink"
        >
          Avbryt
        </button>
      </div>
      {rediger && <input type="hidden" name="id" value={rediger.id} />}
      <div className="flex flex-col gap-3">
        <SkjemaFelt
          etikett="Tittel"
          name="tittel"
          type="text"
          autoComplete="off"
          placeholder="Les 12 bøker i år"
          defaultValue={verdier?.tittel ?? rediger?.title}
          required
        />
        <SkjemaValg
          key={`modus-${nullstillNokkel}`}
          etikett="Sporing"
          name="modus"
          value={modus}
          onChange={(hendelse) => setModus(hendelse.target.value as Modus)}
        >
          <option value="manuell">Manuell logg</option>
          <option value="metrikk">Automatisk – fra metrikk</option>
          <option value="teller">Automatisk – telling</option>
        </SkjemaValg>
        {modus === "manuell" && (
          <div className="grid grid-cols-2 gap-3">
            <SkjemaFelt
              etikett="Målverdi"
              name="maalverdi"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="12"
              defaultValue={verdier?.maalverdi ?? maalverdiStandard}
              required
            />
            <SkjemaFelt
              etikett="Enhet (valgfritt)"
              name="enhet"
              type="text"
              autoComplete="off"
              placeholder="bøker, kr, økter …"
              defaultValue={
                verdier?.enhet ??
                (redigerErManuell ? (rediger?.unit ?? undefined) : undefined)
              }
            />
          </div>
        )}
        {modus === "metrikk" && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SkjemaValg
                etikett="Metrikk"
                name="metrikk"
                required
                defaultValue={verdier?.metrikk ?? rediger?.metricKey ?? ""}
              >
                <option value="">Velg metrikk …</option>
                {metrikkTyper.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.label} ({type.unit})
                  </option>
                ))}
              </SkjemaValg>
              <SkjemaValg
                etikett="Retning"
                name="retning"
                required
                defaultValue={verdier?.retning ?? rediger?.direction ?? ""}
              >
                <option value="">Velg retning …</option>
                <option value="ned">Ned til målverdien</option>
                <option value="opp">Opp til målverdien</option>
              </SkjemaValg>
            </div>
            <SkjemaFelt
              etikett="Målverdi"
              name="maalverdi"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="80"
              defaultValue={verdier?.maalverdi ?? maalverdiStandard}
              required
            />
            <p className="text-xs text-ink-3">
              Fremdriften avledes automatisk fra målingene dine – ingenting å
              logge her.
            </p>
          </>
        )}
        {modus === "teller" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <SkjemaValg
                etikett="Kilde"
                name="kilde"
                required
                defaultValue={verdier?.kilde ?? rediger?.countSource ?? ""}
              >
                <option value="">Velg kilde …</option>
                <option value="journal">Journalinnførsler</option>
                <option value="reiser">Reiser</option>
                <option value="land">Nye land</option>
              </SkjemaValg>
              <SkjemaFelt
                etikett="Antall"
                name="maalverdi"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="52"
                defaultValue={verdier?.maalverdi ?? maalverdiStandard}
                required
              />
            </div>
            <p className="text-xs text-ink-3">
              Telles live fra dataene i appen innenfor målets periode.
            </p>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <SkjemaFelt
            etikett="Fra"
            name="fra"
            type="date"
            defaultValue={verdier?.fra ?? rediger?.startsOn ?? standardDato}
            required
          />
          <SkjemaFelt
            etikett="Frist (valgfritt)"
            name="frist"
            type="date"
            defaultValue={verdier?.frist ?? rediger?.dueOn ?? undefined}
          />
        </div>
        <SkjemaTekstFelt
          etikett="Motivasjon (valgfritt)"
          name="motivasjon"
          rows={2}
          placeholder="Hvorfor er dette viktig?"
          defaultValue={verdier?.motivasjon ?? rediger?.motivation ?? undefined}
        />
        <div>
          <LagreKnappAnimert
            resultat={resultat}
            idleTekst={rediger ? "Oppdater" : "Lagre"}
            lagretTekst={rediger ? "Oppdatert" : "Lagret"}
          />
        </div>
      </div>
      {resultat && (
        <p
          role={resultat.ok ? "status" : "alert"}
          className="mt-3 text-sm text-ink-2"
        >
          {resultat.melding}
        </p>
      )}
    </form>
  );
}
