import Link from "next/link";
import {
  Sparkles,
  BarChart3,
  Search,
  ArrowRight,
  Check,
  Star,
  Zap,
  Target,
  TrendingUp,
  Mail,
  ChevronRight,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Scroll-to-section button (needs client interactivity)                     */
/* -------------------------------------------------------------------------- */
function ScrollButton() {
  return (
    <a
      href="#how-it-works"
      className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
    >
      See How It Works
      <ChevronRight className="h-4 w-4" />
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tiny avatar circles for social proof                                      */
/* -------------------------------------------------------------------------- */
function AvatarStack() {
  const colors = [
    "bg-primary-500",
    "bg-secondary-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-sky-500",
  ];
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {colors.map((color, i) => (
          <span
            key={i}
            className={`inline-block h-8 w-8 rounded-full ${color} ring-2 ring-background`}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Trusted by <span className="font-semibold text-foreground">2,000+</span>{" "}
        content teams
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Features                                                                  */
/* -------------------------------------------------------------------------- */
const features = [
  {
    icon: Sparkles,
    title: "AI Content Generation",
    description:
      "Generate full-length, SEO-optimized articles from a single keyword. Our AI analyzes top-ranking content to create articles that compete.",
  },
  {
    icon: BarChart3,
    title: "Real-Time SEO Scoring",
    description:
      "Get instant SEO analysis with actionable recommendations. Track keyword density, readability, heading structure, and 15+ ranking factors.",
  },
  {
    icon: Search,
    title: "Keyword Intelligence",
    description:
      "Discover high-opportunity keywords with AI-powered difficulty and volume estimates. Build topic clusters that dominate your niche.",
  },
];

/* -------------------------------------------------------------------------- */
/*  How-it-works steps                                                        */
/* -------------------------------------------------------------------------- */
const steps = [
  {
    number: "01",
    icon: Target,
    title: "Enter your target keyword",
    description:
      "Type in the keyword you want to rank for. RankForge instantly analyzes the competitive landscape and top-ranking pages.",
  },
  {
    number: "02",
    icon: Zap,
    title: "AI generates optimized content",
    description:
      "Our AI engine creates a comprehensive, well-structured article optimized for your keyword and search intent.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Publish and watch your rankings climb",
    description:
      "Export your content, publish it to your site, and track how your rankings improve over the coming weeks.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Pricing tiers                                                             */
/* -------------------------------------------------------------------------- */
interface PricingTier {
  name: string;
  price: number;
  description: string;
  features: string[];
  highlighted: boolean;
  planKey: string;
}

const tiers: PricingTier[] = [
  {
    name: "Starter",
    price: 49,
    description: "For solo creators and small blogs getting started with AI SEO.",
    features: [
      "10 articles / month",
      "100 keyword lookups",
      "SEO analysis",
      "Basic support",
    ],
    highlighted: false,
    planKey: "starter",
  },
  {
    name: "Growth",
    price: 129,
    description:
      "For growing teams that need more content and advanced optimization.",
    features: [
      "50 articles / month",
      "500 keyword lookups",
      "Priority support",
      "Content optimization",
      "Team collaboration",
    ],
    highlighted: true,
    planKey: "growth",
  },
  {
    name: "Scale",
    price: 299,
    description:
      "For agencies and enterprises that require unlimited power and flexibility.",
    features: [
      "Unlimited articles",
      "Unlimited keywords",
      "Dedicated support",
      "API access",
      "Custom integrations",
      "White-label option",
    ],
    highlighted: false,
    planKey: "scale",
  },
];

/* -------------------------------------------------------------------------- */
/*  Testimonials                                                              */
/* -------------------------------------------------------------------------- */
const testimonials = [
  {
    quote:
      "RankForge completely transformed our content workflow. We went from publishing 4 articles a month to 30, and our organic traffic tripled in 90 days.",
    name: "Sarah Chen",
    role: "Marketing Director, TechNova",
    initials: "SC",
  },
  {
    quote:
      "The keyword intelligence feature alone is worth the subscription. We discovered untapped opportunities our competitors missed and now own those SERPs.",
    name: "James Rodriguez",
    role: "SEO Manager, GrowthLab",
    initials: "JR",
  },
  {
    quote:
      "I was skeptical about AI content, but RankForge's output quality is genuinely impressive. Our articles consistently hit page one within weeks of publishing.",
    name: "Emily Watkins",
    role: "Content Lead, Meridian Digital",
    initials: "EW",
  },
];

/* -------------------------------------------------------------------------- */
/*  Footer link groups                                                        */
/* -------------------------------------------------------------------------- */
const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "API", href: "#" },
    { label: "Integrations", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

/* ========================================================================== */
/*  PAGE COMPONENT                                                            */
/* ========================================================================== */
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ------------------------------------------------------------------ */}
      {/*  Navbar                                                             */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">RankForge</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </a>
            <a
              href="#testimonials"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Testimonials
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/signin"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ---------------------------------------------------------------- */}
        {/*  Hero Section                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative overflow-hidden py-20 sm:py-32">
          {/* Decorative gradient blobs */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-40 right-0 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />
          </div>

          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-1.5 text-sm text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI-Powered SEO Content Platform
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                Rank{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  #1 on Google
                </span>{" "}
                with AI-Powered Content
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Generate SEO-optimized articles that actually rank. RankForge
                analyzes top-performing content and creates data-driven articles
                in minutes, not hours.
              </p>

              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 hover:shadow-xl hover:shadow-primary/30"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <ScrollButton />
              </div>

              <div className="mt-12 flex justify-center">
                <AvatarStack />
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*  Features Grid                                                   */}
        {/* ---------------------------------------------------------------- */}
        <section id="features" className="border-t border-border/40 py-20 sm:py-28">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to{" "}
                <span className="text-primary">dominate search</span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                A complete toolkit for creating content that ranks, drives
                traffic, and converts visitors into customers.
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-border/60 bg-card p-8 transition-all hover:border-primary/40 hover:shadow-lg"
                >
                  <div className="mb-5 inline-flex rounded-xl bg-primary/10 p-3">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*  How It Works                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="how-it-works"
          className="border-t border-border/40 bg-muted/30 py-20 sm:py-28"
        >
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Three simple steps to{" "}
                <span className="text-primary">higher rankings</span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                No complicated setup. No learning curve. Just results.
              </p>
            </div>

            <div className="mt-16 grid gap-12 lg:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="relative text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <span className="mb-2 block text-sm font-bold uppercase tracking-widest text-primary">
                    Step {step.number}
                  </span>
                  <h3 className="text-xl font-semibold">{step.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*  Pricing Section                                                 */}
        {/* ---------------------------------------------------------------- */}
        <section id="pricing" className="border-t border-border/40 py-20 sm:py-28">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                No hidden fees. Cancel anytime. Start with a 14-day free trial
                on any plan.
              </p>
            </div>

            <div className="mt-16 grid gap-8 lg:grid-cols-3">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`relative flex flex-col rounded-2xl border p-8 transition-shadow ${
                    tier.highlighted
                      ? "border-primary bg-card shadow-xl shadow-primary/10"
                      : "border-border/60 bg-card hover:shadow-lg"
                  }`}
                >
                  {tier.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-semibold">{tier.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {tier.description}
                    </p>
                  </div>

                  <div className="mb-8">
                    <span className="text-4xl font-extrabold">${tier.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>

                  <ul className="mb-8 flex-1 space-y-3">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/auth/signin?plan=${tier.planKey}`}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all ${
                      tier.highlighted
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90"
                        : "border border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*  Testimonials                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="testimonials"
          className="border-t border-border/40 bg-muted/30 py-20 sm:py-28"
        >
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Loved by content teams everywhere
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                See what marketers and SEO professionals are saying about
                RankForge.
              </p>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.name}
                  className="flex flex-col rounded-2xl border border-border/60 bg-card p-8"
                >
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <div className="mt-6 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {testimonial.initials}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        {testimonial.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*  Final CTA                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-t border-border/40 py-20 sm:py-28">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-800 px-8 py-16 text-center text-primary-foreground sm:px-16 sm:py-20">
              {/* Decorative blobs */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent/20 blur-3xl" />

              <div className="relative mx-auto max-w-2xl">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Start Ranking Higher Today
                </h2>
                <p className="mt-4 text-lg text-primary-foreground/80">
                  Join 2,000+ content teams who use RankForge to create
                  SEO-optimized content that drives real results. Start your
                  free trial -- no credit card required.
                </p>

                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <div className="flex w-full max-w-sm items-center gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="email"
                        placeholder="Enter your email"
                        className="h-12 w-full rounded-lg bg-white/10 pl-10 pr-4 text-sm text-primary-foreground placeholder:text-primary-foreground/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/40"
                      />
                    </div>
                    <Link
                      href="/auth/signin"
                      className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-accent px-6 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
                    >
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <p className="mt-4 text-xs text-primary-foreground/60">
                  14-day free trial. No credit card required. Cancel anytime.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/*  Footer                                                             */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-border/40 bg-muted/30 py-12">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand column */}
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold tracking-tight">
                  RankForge
                </span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                The AI-powered SEO content platform that helps you create
                data-driven articles, discover keywords, and rank higher on
                Google.
              </p>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  {category}
                </h4>
                <ul className="mt-4 space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            &copy; 2024 RankForge. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
