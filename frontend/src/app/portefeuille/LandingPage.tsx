"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Manrope, Space_Grotesk } from "next/font/google";
import { useRouter } from "next/navigation";
import { requestJson, resolveAssetUrl } from "@/src/lib/api";
import { writeStoredSession } from "@/src/lib/auth";
import { fetchAvailableOpportunities } from "@/src/lib/opportunities";
import type { AuthSession, PropertyRecord } from "@/src/lib/types";
import styles from "./styles/LandingPage.module.css";
import { motion } from "framer-motion";

type LandingPageProps = {
  onAuthenticated?: () => void;
};

type LeadFormState = {
  name: string;
  email: string;
  company: string;
  message: string;
};

type SignupFormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

type Notice = {
  tone: "success" | "error";
  message: string;
} | null;

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--landing-font-display",
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--landing-font-body",
});

const defaultLeadForm: LeadFormState = {
  name: "",
  email: "",
  company: "",
  message: "",
};

const defaultSignupForm: SignupFormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

const roadmap = [
  {
    phase: "01",
    title: "Whitelist & validation terrain",
    copy: "Constituer une première communauté, recueillir des retours concrets et affiner le parcours utilisateur avant montée en charge.",
  },
  {
    phase: "02",
    title: "Premiers actifs onboardés",
    copy: "Sourcer les premiers biens, publier des fiches lisibles et structurer l’accès à l’investissement fractionné.",
  },
  {
    phase: "03",
    title: "Automatisation des flux",
    copy: "Activer les smart contracts pour la traçabilité des parts, la distribution des loyers et la simplification opérationnelle.",
  },
  {
    phase: "04",
    title: "Conformité & déploiement",
    copy: "Étendre le catalogue, consolider le KYC et faire grandir la plateforme sans perdre en transparence ni en simplicité.",
  },
];

const visionCards = [
  {
    icon: "01",
    title: "Le blocage historique",
    copy: "On présente souvent la pierre comme l’un des meilleurs moyens de construire du patrimoine. Dans les faits, le capital initial, la complexité de gestion et la tension du marché excluent la majorité des profils.",
  },
  {
    icon: "02",
    title: "La réponse NeoImmo",
    copy: "NeoImmo permet d’acheter une fraction de bien immobilier plutôt qu’un actif entier. L’entrée se fait avec un ticket réduit, sans devoir immobiliser le capital d’un achat complet.",
  },
  {
    icon: "03",
    title: "Ce que la technologie change",
    copy: "La blockchain et les smart contracts automatisent la distribution des loyers, la traçabilité des parts et une partie des échanges, tout en laissant une interface compréhensible pour des profils non crypto.",
  },
];

const audienceCards = [
  {
    icon: "A",
    title: "Particuliers qui veulent construire un patrimoine",
    copy: "Des investisseurs retail qui veulent accéder à l’immobilier sans attendre d’avoir un apport massif dès le départ.",
  },
  {
    icon: "B",
    title: "Jeunes actifs, étudiants et primo-investisseurs",
    copy: "Des profils avec une épargne limitée, à la recherche d’une première exposition à un actif réel plus stable qu’un produit purement spéculatif.",
  },
  {
    icon: "C",
    title: "Profils orientés revenus passifs",
    copy: "Des utilisateurs qui cherchent une source de revenus récurrents, avec moins de friction de gestion qu’une détention immobilière traditionnelle.",
  },
];

const modelCards = [
  {
    icon: "01",
    title: "Fractions plus fines, ticket plus bas",
    copy: "La plateforme découpe l’investissement de manière plus granulaire que les modèles classiques de propriété partagée, afin de réduire le montant à engager par utilisateur.",
  },
  {
    icon: "02",
    title: "Monétisation simple et récurrente",
    copy: "Le modèle combine des frais de transaction sur les ventes tokenisées et des frais de gestion récurrents liés à l’exploitation des actifs et aux loyers.",
  },
  {
    icon: "03",
    title: "Gouvernance organisée, pas de blocage",
    copy: "Les décisions importantes comme une vente ou des travaux peuvent être structurées via des votes majoritaires, au lieu de laisser des copropriétaires coincés dans un “mariage” financier ingérable.",
  },
  {
    icon: "04",
    title: "Exécution scalable",
    copy: "Le business plan vise un break-even au mois 9, avec une montée progressive des actifs sous gestion, un objectif de revenus année 1 à 1,2 M$ et un besoin d’amorçage estimé entre 500 k$ et 1,5 M$ pour lancer proprement le MVP.",
  },
];

const faqItems = [
  {
    question: "Comment fonctionne concrètement une fraction de bien ?",
    answer:
      "Vous n’achetez pas un immeuble entier, mais une part d’un actif. Cette part ouvre droit à une quote-part des revenus locatifs et s’intègre dans un portefeuille suivi depuis la plateforme.",
  },
  {
    question: "Faut-il être expert en crypto pour utiliser NeoImmo ?",
    answer:
      "Non. La technologie blockchain sert d’infrastructure pour automatiser et tracer les opérations, mais l’expérience doit rester simple et compréhensible pour des utilisateurs non spécialistes.",
  },
  {
    question: "D’où viennent les revenus distribués ?",
    answer:
      "L’ambition est de redistribuer une part des loyers perçus par les actifs, proportionnellement aux fractions détenues, avec une logique d’automatisation via smart contracts.",
  },
  {
    question: "Qui décide en cas de vente ou de travaux sur un bien ?",
    answer:
      "NeoImmo veut structurer ces décisions au niveau de la plateforme, avec des mécanismes de vote majoritaire pour éviter les blocages habituels de la propriété partagée.",
  },
  {
    question: "À quel stade en est le projet aujourd’hui ?",
    answer:
      "Le projet est dans une phase de validation: constitution d’une communauté early-access, cadrage des premiers actifs, structuration du MVP et préparation des couches conformité/KYC.",
  },
  {
    question: "Puis-je déjà consulter des actifs sans créer de compte ?",
    answer:
      "Oui. La landing expose déjà les biens publiés pour expliquer la proposition de valeur avant l’inscription ou la prise de contact.",
  },
];

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} €`;
}

function summarizeProperty(property: PropertyRecord) {
  return property.description.length > 150
    ? `${property.description.slice(0, 147)}...`
    : property.description;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: "easeOut" },
};

export default function LandingPage({ onAuthenticated }: LandingPageProps) {
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState<LeadFormState>(defaultLeadForm);
  const [signupForm, setSignupForm] =
    useState<SignupFormState>(defaultSignupForm);
  const [leadNotice, setLeadNotice] = useState<Notice>(null);
  const [signupNotice, setSignupNotice] = useState<Notice>(null);
  const [signupSubmitting, setSignupSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProperties() {
      try {
        const items = await fetchAvailableOpportunities();

        if (!cancelled) {
          setProperties(items);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Impossible de charger les biens disponibles.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProperties();

    return () => {
      cancelled = true;
    };
  }, []);

  function scrollCarousel(direction: "previous" | "next") {
    const node = carouselRef.current;

    if (!node) {
      return;
    }

    const offset = node.clientWidth * 0.82;

    node.scrollBy({
      left: direction === "next" ? offset : -offset,
      behavior: "smooth",
    });
  }

  function handleLeadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLeadNotice({
      tone: "success",
      message:
        "Votre demande a bien été enregistrée. Elle nous aidera à prioriser la phase pilote, les partenariats et la whitelist NeoImmo.",
    });
    setLeadForm(defaultLeadForm);
  }

  async function handleSignupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupSubmitting(true);
    setSignupNotice(null);

    try {
      const session = await requestJson<AuthSession>("/auth/register", {
        method: "POST",
        body: JSON.stringify(signupForm),
      });

      writeStoredSession(session);
      setSignupNotice({
        tone: "success",
        message: "Compte créé. Vous rejoignez maintenant l’espace NeoImmo.",
      });

      onAuthenticated?.();
      router.replace("/");
      router.refresh();
    } catch (caughtError) {
      setSignupNotice({
        tone: "error",
        message:
          caughtError instanceof Error
            ? caughtError.message
            : "Inscription impossible.",
      });
    } finally {
      setSignupSubmitting(false);
    }
  }

  const totalTokens = properties.reduce(
    (sum, property) => sum + property.tokenNumber,
    0,
  );
  const leadNoticeClassName =
    leadNotice?.tone === "success" ? styles.noticeSuccess : styles.noticeError;
  const signupNoticeClassName =
    signupNotice?.tone === "success"
      ? styles.noticeSuccess
      : styles.noticeError;

  return (
    <main
      className={`${styles.page} ${displayFont.variable} ${bodyFont.variable}`}
    >
      <div className={styles.shell}>
        <motion.header
          className={styles.header}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <div className={styles.brand}>
            <div className={styles.brandMark}>NI</div>
            <div className={styles.brandCopy}>
              <strong>NeoImmo</strong>
              <span>Investir, petit à petit.</span>
            </div>
          </div>

          <nav className={styles.nav}>
            <a href="#vision">Solution</a>
            <a href="#market">Actifs</a>
            {/* <a href="#audience">Cibles</a> */}
            <a href="#model">Économie</a>
            <a href="#roadmap">Roadmap</a>
            <a href="#contact">Contact</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className={styles.headerActions}>
            <Link href="/signin" className={styles.ghostAction}>
              Connexion
            </Link>
            <a href="#signup" className={styles.primaryAction}>
              S&apos;inscrire
            </a>
          </div>
        </motion.header>

        <motion.section
          className={styles.hero}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className={styles.mainTitle}>
            <div className={styles.eyebrow}>
              Immobilier fractionné & blockchain
            </div>
            <h1 className={styles.heroTitle}>
              Posséder une partie d&apos;un immeuble depuis son téléphone.
            </h1>
            <p className={styles.heroSubtitle}>
              NeoImmo ouvre l’investissement immobilier à des profils qui en
              sont habituellement exclus par le capital initial. Vous achetez
              une fraction de bien, vous suivez vos parts dans une interface
              simple, et le projet prépare l’automatisation des flux locatifs et
              de la gouvernance.
            </p>

            <div className={styles.chipRow}>
              <span className={styles.chip}>Ticket d’entrée réduit</span>
              <span className={styles.chip}>Actifs réels</span>
              <span className={styles.chip}>Loyers automatisés</span>
              <span className={styles.chip}>Votes communautaires</span>
            </div>

            <div className={styles.heroActions}>
              <a href="#market" className={styles.primaryAction}>
                Explorer les actifs
              </a>
              <a href="#contact" className={styles.secondaryAction}>
                Parler au projet
              </a>
              <a href="#signup" className={styles.ghostAction}>
                Créer mon compte
              </a>
            </div>

            <div className={styles.heroMetrics}>
              <article className={styles.metric}>
                <span>Actifs publics</span>
                <strong>{loading ? "..." : properties.length}</strong>
                <p>
                  Une première vitrine pour découvrir les biens déjà publiés sur
                  la plateforme.
                </p>
              </article>
              <article className={styles.metric}>
                <span>Tokens exposés</span>
                <strong>
                  {loading
                    ? "..."
                    : new Intl.NumberFormat("fr-FR").format(totalTokens)}
                </strong>
                <p>
                  Le volume affiché permet de donner immédiatement l’échelle du
                  marché visé.
                </p>
              </article>
              <article className={styles.metric}>
                <span>Break-even ciblé</span>
                <strong>Mois 9</strong>
                <p>
                  Un objectif de montée en charge posé dans le business plan,
                  après onboarding des premiers actifs.
                </p>
              </article>
            </div>
          </div>
        </motion.section>

        <motion.section id="vision" className={styles.section} {...fadeInUp}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.eyebrow}>Notre projet</div>
              <h2>
                Rendre la pierre accessible sans trahir la logique d’un actif
                réel
              </h2>
              <p>
                L’idée n’est pas de rendre l’immobilier “plus hype”. L’idée est
                de débloquer un marché historiquement fermé, en combinant
                fractionnement de l’investissement, transparence et
                automatisation.
              </p>
            </div>
          </div>
          <div className={styles.infoGrid}>
            {visionCards.map((card, index) => (
              <motion.article
                key={card.title}
                className={styles.infoCard}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: index * 0.1 }}
              >
                <div className={styles.iconBadge}>{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <section id="market" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.eyebrow}>Actifs en vitrine</div>
              <h2>Nos offre disponibles</h2>
              <p>
                Nous proposons un large eventails de biens disponible pour
                l&apos;achat fractionné
              </p>
            </div>
            <div className={styles.carouselTools}>
              <button
                type="button"
                className={styles.carouselButton}
                onClick={() => scrollCarousel("previous")}
                disabled={properties.length < 2}
              >
                ←
              </button>
              <button
                type="button"
                className={styles.carouselButton}
                onClick={() => scrollCarousel("next")}
                disabled={properties.length < 2}
              >
                →
              </button>
            </div>
          </div>

          {loading ? (
            <div className={styles.emptyState}>
              Chargement des biens disponibles...
            </div>
          ) : error ? (
            <div className={styles.emptyState}>{error}</div>
          ) : properties.length === 0 ? (
            <div className={styles.emptyState}>
              Aucun bien public n’est disponible pour le moment.
            </div>
          ) : (
            <div className={styles.carouselTrack} ref={carouselRef}>
              {properties.map((property) => (
                <article key={property.id} className={styles.carouselCard}>
                  <div
                    className={styles.carouselMedia}
                    style={
                      property.images[0]
                        ? {
                            backgroundImage: `url(${resolveAssetUrl(property.images[0])})`,
                          }
                        : {
                            backgroundImage:
                              "linear-gradient(135deg, rgba(var(--theme-primary-rgb), 0.18), rgba(var(--theme-secondary-rgb), 0.8))",
                          }
                    }
                  />
                  <div className={styles.carouselCopy}>
                    <div>
                      <h3>{property.name}</h3>
                      <p>{property.localization}</p>
                    </div>
                    <div className={styles.featureList}>
                      <span>{property.livingArea}</span>
                      <span>{property.roomNumber} pièces</span>
                      <span>Score {property.score}/5</span>
                    </div>
                    <p>{summarizeProperty(property)}</p>
                    <div className={styles.chipRow}>
                      {property.keyPoints.slice(0, 4).map((keyPoint) => (
                        <span key={keyPoint} className={styles.chip}>
                          {keyPoint}
                        </span>
                      ))}
                    </div>
                    <div className={styles.carouselFooter}>
                      <div>
                        <strong>{formatCurrency(property.tokenPrice)}</strong>
                        <small>par token</small>
                      </div>
                      <small>
                        {new Intl.NumberFormat("fr-FR").format(
                          property.tokenNumber,
                        )}{" "}
                        tokens
                      </small>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="audience" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.eyebrow}>Cibles prioritaires</div>
              <h2>Pour qui NeoImmo est construit dès le départ</h2>
              <p>
                Le projet vise d’abord des utilisateurs qui veulent une
                exposition immobilière lisible, plus flexible et moins lourde
                qu’un achat direct.
              </p>
            </div>
          </div>

          <div className={styles.infoGrid}>
            {audienceCards.map((card, index) => (
              <motion.article
                key={card.title}
                className={styles.infoCard}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: index * 0.1 }}
              >
                <article key={card.title} className={styles.infoCard}>
                  <div className={styles.iconBadge}>{card.icon}</div>
                  <h3>{card.title}</h3>
                  <p>{card.copy}</p>
                </article>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="model" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.eyebrow}>Économie & exécution</div>
              <h2>
                Un produit pensé pour être simple côté utilisateur et robuste
                côté plateforme
              </h2>
              <p>
                NeoImmo ne se limite pas à tokeniser des biens. Le projet
                articule accessibilité, gouvernance, frais compréhensibles et
                montée en charge progressive.
              </p>
            </div>
          </div>

          <div className={styles.infoGrid}>
            {modelCards.map((card, index) => (
              <motion.article
                key={card.title}
                className={styles.infoCard}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: index * 0.1 }}
              >
                <article key={card.title} className={styles.infoCard}>
                  <div className={styles.iconBadge}>{card.icon}</div>
                  <h3>{card.title}</h3>
                  <p>{card.copy}</p>
                </article>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="roadmap" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.eyebrow}>Roadmap</div>
              <h2>Les étapes pour passer du concept au déploiement crédible</h2>
              <p>
                La logique est simple: valider, onboarder les premiers actifs,
                automatiser les flux, puis élargir le catalogue dans un cadre de
                conformité solide.
              </p>
            </div>
          </div>

          <div className={styles.roadmapGrid}>
            {roadmap.map((step, index) => (
              <motion.article
                key={step.title}
                className={styles.infoCard}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: index * 0.1 }}
              >
                <article key={step.phase} className={styles.roadmapCard}>
                  <div className={styles.phase}>{step.phase}</div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="contact" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.eyebrow}>Validation terrain</div>
              <h2>
                Premiers utilisateurs, partenaires actifs et retours concrets
              </h2>
              <p>
                Aujourd’hui, l’enjeu est de confronter NeoImmo au terrain:
                comprendre les attentes des premiers utilisateurs, structurer
                des partenariats et préparer l’exécution à plus grande échelle.
              </p>
            </div>
          </div>

          <div className={styles.lowerGrid}>
            <article className={styles.contactPanel}>
              <div className={styles.contactStack}>
                <div>
                  <div className={styles.eyebrow}>Parler au projet</div>
                  <h3>Vous voulez participer à la phase pilote ?</h3>
                  <p>
                    Que vous soyez investisseur, opérateur immobilier,
                    partenaire ou simplement intéressé par le concept,
                    laissez-nous votre contexte pour que l’on vous recontacte
                    dans le bon cadre.
                  </p>
                </div>

                <div className={styles.contactMini}>
                  <span>Validation</span>
                  <strong>Premiers utilisateurs & feedback produit</strong>
                  <p>
                    Nous cherchons des retours concrets pour ajuster
                    l’expérience avant montée en charge.
                  </p>
                </div>
                <div className={styles.contactMini}>
                  <span>Partenariats</span>
                  <strong>
                    Opérateurs immobiliers, property managers, communautés
                    financières
                  </strong>
                  <p>
                    Le projet a besoin d’actifs, de distribution et de relais de
                    confiance.
                  </p>
                </div>
                <div className={styles.contactMini}>
                  <span>Canaux</span>
                  <strong>Whitelist, newsletter, Instagram, LinkedIn</strong>
                  <p>
                    Le lancement passe d’abord par une communauté engagée et
                    bien informée.
                  </p>
                </div>

                {leadNotice ? (
                  <div className={leadNoticeClassName}>
                    {leadNotice.message}
                  </div>
                ) : null}

                <form
                  className={styles.contactForm}
                  onSubmit={handleLeadSubmit}
                >
                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      <span>Nom</span>
                      <input
                        value={leadForm.name}
                        onChange={(event) =>
                          setLeadForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Nom et prénom"
                        required
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Email</span>
                      <input
                        type="email"
                        value={leadForm.email}
                        onChange={(event) =>
                          setLeadForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        placeholder="vous@exemple.fr"
                        required
                      />
                    </label>
                  </div>

                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      <span>Société / structure</span>
                      <input
                        value={leadForm.company}
                        onChange={(event) =>
                          setLeadForm((current) => ({
                            ...current,
                            company: event.target.value,
                          }))
                        }
                        placeholder="Société, média ou structure"
                      />
                    </label>
                    <div className={styles.field}>
                      <span>Sujet principal</span>
                      <div className={styles.featureList}>
                        <span>Accès early</span>
                        <span>Partenariat actif</span>
                        <span>Validation concept</span>
                      </div>
                    </div>
                  </div>

                  <label className={styles.field}>
                    <span>Message</span>
                    <textarea
                      value={leadForm.message}
                      onChange={(event) =>
                        setLeadForm((current) => ({
                          ...current,
                          message: event.target.value,
                        }))
                      }
                      placeholder="Je veux comprendre le modèle, suivre la whitelist, discuter d’un partenariat ou découvrir comment seront gérés les premiers actifs."
                      required
                    />
                  </label>

                  <button type="submit" className={styles.secondaryAction}>
                    Envoyer la demande
                  </button>
                  <p className={styles.formNote}>
                    Chaque message nous aide à prioriser le produit, les
                    partenariats et la préparation du lancement.
                  </p>
                </form>
              </div>
            </article>

            <div className={styles.signupStack}>
              <article id="signup" className={styles.signupPanel}>
                <div>
                  <div className={styles.eyebrow}>Accès anticipé</div>
                  <h3>
                    Créer un compte et rejoindre la première cohorte NeoImmo
                  </h3>
                  <p>
                    L’inscription vous donne un accès immédiat à l’espace
                    NeoImmo et prépare les futurs parcours de qualification
                    investisseur, de KYC et de suivi de portefeuille.
                  </p>
                </div>

                {signupNotice ? (
                  <div className={signupNoticeClassName}>
                    {signupNotice.message}
                  </div>
                ) : null}

                <form
                  className={styles.signupForm}
                  onSubmit={handleSignupSubmit}
                >
                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      <span>Prénom</span>
                      <input
                        value={signupForm.firstName}
                        onChange={(event) =>
                          setSignupForm((current) => ({
                            ...current,
                            firstName: event.target.value,
                          }))
                        }
                        placeholder="Anis"
                        required
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Nom</span>
                      <input
                        value={signupForm.lastName}
                        onChange={(event) =>
                          setSignupForm((current) => ({
                            ...current,
                            lastName: event.target.value,
                          }))
                        }
                        placeholder="Dupont"
                        required
                      />
                    </label>
                  </div>

                  <label className={styles.field}>
                    <span>Email</span>
                    <input
                      type="email"
                      value={signupForm.email}
                      onChange={(event) =>
                        setSignupForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="vous@exemple.fr"
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    <span>Mot de passe</span>
                    <input
                      type="password"
                      value={signupForm.password}
                      onChange={(event) =>
                        setSignupForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Choisissez un mot de passe"
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    className={styles.primaryAction}
                    disabled={signupSubmitting}
                  >
                    {signupSubmitting
                      ? "Création du compte..."
                      : "Rejoindre NeoImmo"}
                  </button>
                </form>
              </article>

              <article className={styles.faqPanel}>
                <div>
                  <div className={styles.eyebrow}>
                    Connexion & compréhension
                  </div>
                  <h3>Déjà onboardé ou simplement en veille ?</h3>
                  <p>
                    Connectez-vous si vous avez déjà un compte. Sinon,
                    poursuivez avec la FAQ pour comprendre le produit, son stade
                    d’avancement et sa logique économique.
                  </p>
                </div>

                <div className={styles.heroActions}>
                  <Link href="/signin" className={styles.ghostAction}>
                    Aller à la connexion
                  </Link>
                  <a href="#faq" className={styles.secondaryAction}>
                    Voir la FAQ
                  </a>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="faq" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.eyebrow}>FAQ</div>
              <h2>Les questions qui reviennent avant de rejoindre le projet</h2>
              <p>
                Ces réponses posent le cadre: accessibilité, rôle de la
                blockchain, gestion des revenus et gouvernance des actifs.
              </p>
            </div>
          </div>

          <article className={styles.faqPanel}>
            <div className={styles.faqList}>
              {faqItems.map((item) => (
                <details key={item.question} className={styles.faqItem}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </article>
        </section>

        <footer className={styles.footer}>
          <span>
            NeoImmo ouvre l’investissement immobilier à une nouvelle génération
            d’utilisateurs, avec plus de fluidité, plus de transparence et moins
            de barrières à l’entrée.
          </span>
          <div className={styles.footerLinks}>
            <a href="#vision">Solution</a>
            <a href="#market">Catalogue</a>
            <a href="#audience">Cibles</a>
            <a href="#roadmap">Roadmap</a>
            <a href="#contact">Contact</a>
            <Link href="/signin">Connexion</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
