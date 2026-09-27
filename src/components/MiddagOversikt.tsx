import type { Dinner } from "@/lib/types";
import { formatTall } from "@/lib/format";
import { naeringPerPorsjon, naeringsDekning } from "@/lib/ernaering";

// Næringstall + ingrediensliste for én middag – delt mellom oppskrifts-
// visningen (MiddagDetalj) og dagsvalget (DagVelger, der den viser dagens
// valgte rett over listen man kan bytte fra).
export function MiddagOversikt({ middag }: { middag: Dinner }) {
  const naering = naeringPerPorsjon(middag);
  const dekning = naeringsDekning(middag);

  return (
    <div>
      {/* Næring per porsjon som fire småtall – tallet stort, enheten liten. */}
      <dl className="grid grid-cols-4 gap-2 rounded-lg border border-edge bg-bg p-3">
        <Tall
          etikett="kcal"
          verdi={naering === null ? "–" : String(Math.round(naering.kcal))}
        />
        <Tall
          etikett="protein"
          verdi={naering === null ? "–" : `${Math.round(naering.proteinG)} g`}
        />
        <Tall
          etikett="fett"
          verdi={naering === null ? "–" : `${Math.round(naering.fatG)} g`}
        />
        <Tall
          etikett="karbo"
          verdi={naering === null ? "–" : `${Math.round(naering.carbsG)} g`}
        />
      </dl>
      <p className="mt-1.5 text-xs tabular-nums text-ink-3">
        Per porsjon · {middag.servings}{" "}
        {middag.servings === 1 ? "porsjon" : "porsjoner"} i oppskriften
        {naering !== null && ` · ${Math.round(naering.fiberG)} g fiber`}
        {dekning.talte < dekning.totalt &&
          ` · basert på ${dekning.talte} av ${dekning.totalt} ingredienser`}
      </p>

      {middag.ingredients.length > 0 && (
        <section className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-widest text-ink-3">
            Ingredienser
          </h3>
          <ul className="mt-2 divide-y divide-edge">
            {middag.ingredients.map((rad) => (
              <li key={rad.id} className="flex items-baseline gap-3 py-1.5 text-sm">
                <span className="w-16 shrink-0 text-right text-xs tabular-nums text-ink-3">
                  {rad.amount === null
                    ? "etter smak"
                    : `${formatTall(rad.amount)} ${rad.unit}`}
                </span>
                <span className="min-w-0 flex-1 break-words text-ink-2">
                  {rad.label}
                  {rad.foodItem !== null && rad.foodItem.name !== rad.label && (
                    <span className="text-ink-3"> · {rad.foodItem.name}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Tall({ etikett, verdi }: { etikett: string; verdi: string }) {
  return (
    <div className="min-w-0 text-center">
      <dd className="text-base font-semibold tabular-nums leading-none text-ink">
        {verdi}
      </dd>
      <dt className="mt-1 text-[0.65rem] uppercase tracking-widest text-ink-3">
        {etikett}
      </dt>
    </div>
  );
}
