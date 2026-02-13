import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@rankforge.ai" },
    update: {},
    create: {
      email: "demo@rankforge.ai",
      name: "Demo User",
    },
  });

  // Create a demo project
  const project = await prisma.project.upsert({
    where: { id: "demo-project-1" },
    update: {},
    create: {
      id: "demo-project-1",
      name: "My First Website",
      description: "Demo project for RankForge",
      domain: "example.com",
      userId: user.id,
    },
  });

  // Create sample articles
  const articles = [
    {
      title: "10 Best Practices for On-Page SEO in 2024",
      slug: "best-practices-on-page-seo-2024",
      content: "This is a sample article about on-page SEO best practices...",
      metaDescription: "Learn the top 10 on-page SEO best practices that will help your website rank higher in 2024.",
      seoScore: 85,
      targetKeyword: "on-page SEO best practices",
      wordCount: 2500,
    },
    {
      title: "How to Do Keyword Research: A Complete Guide",
      slug: "how-to-do-keyword-research-complete-guide",
      content: "Keyword research is the foundation of any successful SEO strategy...",
      metaDescription: "Master keyword research with this comprehensive guide covering tools, techniques, and strategies.",
      seoScore: 78,
      targetKeyword: "keyword research guide",
      wordCount: 3200,
    },
    {
      title: "Content Marketing Strategy for Small Businesses",
      slug: "content-marketing-strategy-small-businesses",
      content: "Small businesses can leverage content marketing to compete with larger companies...",
      metaDescription: "Build an effective content marketing strategy for your small business with these proven techniques.",
      seoScore: 92,
      targetKeyword: "content marketing small business",
      wordCount: 1800,
    },
  ];

  for (const article of articles) {
    await prisma.article.create({
      data: {
        ...article,
        status: "PUBLISHED",
        projectId: project.id,
        userId: user.id,
      },
    });
  }

  // Create sample keywords
  const keywords = [
    { term: "on-page SEO", volume: 12000, difficulty: 45, cpc: 3.5 },
    { term: "keyword research tool", volume: 8500, difficulty: 62, cpc: 5.2 },
    { term: "content marketing", volume: 22000, difficulty: 71, cpc: 4.8 },
    { term: "SEO audit checklist", volume: 6800, difficulty: 38, cpc: 2.9 },
    { term: "blog post optimization", volume: 3400, difficulty: 29, cpc: 1.8 },
  ];

  for (const keyword of keywords) {
    await prisma.keyword.create({
      data: {
        ...keyword,
        projectId: project.id,
      },
    });
  }

  console.log("Seed complete!");
  console.log(`  Created user: ${user.email}`);
  console.log(`  Created project: ${project.name}`);
  console.log(`  Created ${articles.length} articles`);
  console.log(`  Created ${keywords.length} keywords`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
